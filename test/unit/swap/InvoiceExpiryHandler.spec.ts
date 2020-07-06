import { Op } from 'sequelize';
import bolt11 from '@boltz/bolt11';
import { randomBytes } from 'crypto';
import { ECPair } from 'bitcoinjs-lib';
import Logger from '../../../lib/Logger';
import LndClient from '../../../lib/lightning/LndClient';
import { Currency } from '../../../lib/wallet/WalletManager';
import { getHexBuffer, getHexString, getUnixTime } from '../../../lib/Utils';
import { OrderSide, SwapUpdateEvent } from '../../../lib/consts/Enums';
import InvoiceExpiryHandler from '../../../lib/swap/InvoiceExpiryHandler';
import ReverseSwapRepository from '../../../lib/db/ReverseSwapRepository';

const mockCancelInvoice = jest.fn().mockResolvedValue({});

jest.mock('../../../lib/lightning/LndClient', () => {
  return jest.fn().mockImplementation(() => {
    return {
      cancelInvoice: mockCancelInvoice,
    };
  });
});

const MockedLndClient = <jest.Mock<LndClient>><any>LndClient;

const mockGetReverseSwapsResult: any[] = [];
const mockGetReverseSwaps = jest.fn().mockImplementation(() => {
  return mockGetReverseSwapsResult;
});

const mockSetReverseSwapStatus = jest.fn().mockImplementation((reverseSwap) => {
  return {
    ...reverseSwap,
    status: SwapUpdateEvent.InvoiceExpired,
  };
});

jest.mock('../../../lib/db/ReverseSwapRepository', () => {
  return jest.fn().mockImplementation(() => {
    return {
      getReverseSwaps: mockGetReverseSwaps,
      setReverseSwapStatus: mockSetReverseSwapStatus,
    };
  });
});

const MockedReverseSwapRepository = <jest.Mock<ReverseSwapRepository>><any>ReverseSwapRepository;

const makeInvoice = (preimageHash: string, expiryDelta: number) => {
  const keys = ECPair.makeRandom();

  const invoiceConstructor = bolt11.encode({
    tags: [
      {
        tagName: 'payment_hash',
        data: preimageHash,
      },
    ],
    payeeNodeKey: getHexString(keys.publicKey),
    timestamp: getUnixTime() + expiryDelta,
  });

  return bolt11.sign(invoiceConstructor, getHexString(keys.privateKey!)).paymentRequest;
};

describe('InvoiceExpiryHandler', () => {
  const lndClient = MockedLndClient();

  const currencies = new Map<string, Currency>([
    [
      'BTC',
      {
        lndClient,
      } as any,
    ],
  ]);

  const reverseSwapRepository = new MockedReverseSwapRepository();

  const expiryHandler = new InvoiceExpiryHandler(
    Logger.disabledLogger,
    currencies,
    reverseSwapRepository,
  );

  const checkExpiredInvoices = expiryHandler['checkExpiredInvoices'];

  const preimageHash = getHexString(randomBytes(32));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should init', () => {
    expiryHandler.init();
    expect(expiryHandler.interval).not.toBeUndefined();
  });

  // For the sake of 100% code coverage :rolling_eyes:
  test('should not do anything when there are no pending Reverse Swaps', async () => {
    await checkExpiredInvoices();

    expect(mockGetReverseSwaps).toHaveBeenCalledTimes(1);
    expect(mockGetReverseSwaps).toHaveBeenCalledWith({
      status: {
        [Op.or]: [
          SwapUpdateEvent.SwapCreated,
          SwapUpdateEvent.MinerFeePaid,
        ],
      },
    });

    expect(mockCancelInvoice).toHaveBeenCalledTimes(0);
  });

  test('should ignore invoices that are not expired yet', async () => {
    mockGetReverseSwapsResult.push({
      pair: 'LTC/BTC',
      orderSide: OrderSide.BUY,
      invoice: makeInvoice(preimageHash, 10),
    });

    await checkExpiredInvoices();

    expect(mockGetReverseSwaps).toHaveBeenCalledTimes(1);
    expect(mockGetReverseSwaps).toHaveBeenCalledWith({
      status: {
        [Op.or]: [
          SwapUpdateEvent.SwapCreated,
          SwapUpdateEvent.MinerFeePaid,
        ],
      },
    });

    expect(mockCancelInvoice).toHaveBeenCalledTimes(0);
  });

  test('should cancel expired invoices', async () => {
    mockGetReverseSwapsResult[0].invoice = makeInvoice(preimageHash, -3601);

    let invoiceEmitted = false;

    expiryHandler.once('invoice.expired', (reverseSwap) => {
      expect(reverseSwap).toEqual({
        ...mockGetReverseSwapsResult[0],
        status: SwapUpdateEvent.InvoiceExpired,
      });
      invoiceEmitted = true;
    });

    await checkExpiredInvoices();

    expect(mockGetReverseSwaps).toHaveBeenCalledTimes(1);
    expect(mockGetReverseSwaps).toHaveBeenCalledWith({
      status: {
        [Op.or]: [
          SwapUpdateEvent.SwapCreated,
          SwapUpdateEvent.MinerFeePaid,
        ],
      },
    });

    expect(mockCancelInvoice).toHaveBeenCalledTimes(1);
    expect(mockCancelInvoice).toHaveBeenCalledWith(getHexBuffer(preimageHash));

    expect(mockSetReverseSwapStatus).toHaveBeenCalledTimes(1);
    expect(mockSetReverseSwapStatus).toHaveBeenCalledWith(mockGetReverseSwapsResult[0], SwapUpdateEvent.InvoiceExpired);

    expect(invoiceEmitted).toEqual(true);
  });

  test('should stop', () => {
    expiryHandler.stop();
    expect(expiryHandler.interval).toBeUndefined();
  });
});
