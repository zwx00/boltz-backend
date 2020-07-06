import { Op } from 'sequelize';
import { EventEmitter } from 'events';
import Logger from '../Logger';
import { SwapUpdateEvent } from '../consts/Enums';
import { Currency } from '../wallet/WalletManager';
import ReverseSwap from '../db/models/ReverseSwap';
import ReverseSwapRepository from '../db/ReverseSwapRepository';
import {
  decodeInvoice,
  getHexBuffer,
  getInvoiceExpiry,
  getLightningCurrency,
  getUnixTime,
  splitPairId,
} from '../Utils';

interface InvoiceExpiryHandler {
  on(event: 'invoice.expired', listener: (reverseSwap: ReverseSwap) => void): this;
  emit(event: 'invoice.expired', reverseSwap: ReverseSwap): boolean;
}

class InvoiceExpiryHandler extends EventEmitter {
  public interval: any;

  // How often the invoices should be checked for expired ones in seconds
  private static readonly checkInterval = 60;

  constructor(
    private logger: Logger,
    private currencies: Map<string, Currency>,
    private reverseSwapRepository: ReverseSwapRepository,
  ) {
    super();
  }

  public init = () => {
    this.logger.verbose(`Checking for expired invoices every ${InvoiceExpiryHandler.checkInterval} seconds`);
    this.interval = setInterval(this.checkExpiredInvoices, InvoiceExpiryHandler.checkInterval * 1000);
  }

  public stop = () => {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  private checkExpiredInvoices = async () => {
    const pendingSwaps = await this.reverseSwapRepository.getReverseSwaps({
      status: {
        [Op.or]: [
          SwapUpdateEvent.SwapCreated,
          SwapUpdateEvent.MinerFeePaid,
        ],
      },
    });

    if (pendingSwaps.length === 0) {
      return;
    }

    this.logger.silly(`Checking ${pendingSwaps.length} Reverse Swaps for expired invoices`);

    const currentTime = getUnixTime();

    for (const reverseSwap of pendingSwaps) {
      const { paymentHash, timestamp, timeExpireDate } = decodeInvoice(reverseSwap.invoice);
      const invoiceExpiry = getInvoiceExpiry(timestamp, timeExpireDate);

      if (currentTime > invoiceExpiry) {
        this.logger.debug(`Cancelling expired hold invoice of Reverse Swap ${reverseSwap.id}`);

        const { base, quote } = splitPairId(reverseSwap.pair);
        const lightningCurrency = getLightningCurrency(base, quote, reverseSwap.orderSide, true);

        await this.currencies.get(lightningCurrency)!.lndClient!.cancelInvoice(getHexBuffer(paymentHash!));

        this.emit('invoice.expired',
          await this.reverseSwapRepository.setReverseSwapStatus(reverseSwap, SwapUpdateEvent.InvoiceExpired),
        );
      }
    }
  }
}

export default InvoiceExpiryHandler;
