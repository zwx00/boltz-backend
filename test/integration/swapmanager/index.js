import SwapManager from '../../../lib/swap/SwapManager';
import { btcdClient, btcManager, btcAddress } from '../chain/ChainClient.spec';
import Logger from '../../../lib/Logger';
import Database from '../../../lib/db/Database';
import WalletManager from '../../../lib/wallet/WalletManager';

describe('SwapManger', () => {
  const database = new Database(Logger.disabledLogger, ':memory:');

  const currencies = [
    {
      chainClient,
      lndClient,
      symbol: 'BTC',
      network: Networks.bitcoinRegtest,
    },
    {
      chainClient,
      lndClient,
      symbol: 'LTC',
      network: Networks.litecoinRegtest,
    },
  ];
  const mnemonicpath = 'mnemonic.dat';

  const walletManager = new  WalletManager(Logger.disabledLogger, currencies, database, mnemonicpath);
  const swapManager = new SwapManager(Logger.disabledLogger, walletManager, currencies);

  before(async () => {});

  after(async () => {
    await btcdClient.disconnect();
  });
});
