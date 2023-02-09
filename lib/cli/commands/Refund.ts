import { Arguments } from 'yargs';
import { constructRefundTransaction } from 'boltz-core';
import { constructRefundTransaction as constructRefundTransactionLiquid } from 'boltz-core-liquid';
import { prepareTx } from '../Command';
import { stringify } from '../../Utils';
import BuilderComponents from '../BuilderComponents';

export const command = 'refund <network> <privateKey> <timeoutBlockHeight> <redeemScript> <rawTransaction> <destinationAddress> [feePerVbyte]';

export const describe = 'refunds submarine or chain to chain swaps';

export const builder = {
  network: BuilderComponents.network,
  privateKey: BuilderComponents.privateKey,
  timeoutBlockHeight: {
    describe: 'timeout block height of the swap',
    type: 'number',
  },
  redeemScript: BuilderComponents.redeemScript,
  rawTransaction: BuilderComponents.rawTransaction,
  destinationAddress: BuilderComponents.destinationAddress,
  feePerVbyte: BuilderComponents.feePerVbyte,
};

export const handler = (argv: Arguments<any>): void => {
  const {
    network,
    keys,
    isLiquid,
    swapOutput,
    transaction,
    redeemScript,
    destinationAddress,
  } = prepareTx(argv);

  const refundTransaction = (isLiquid ? constructRefundTransactionLiquid : constructRefundTransaction)(
    [{
      ...swapOutput,
      keys,
      redeemScript,
      txHash: transaction.getHash(),
    } as any],
    destinationAddress,
    argv.timeoutBlockHeight,
    argv.feePerVbyte,
    true,
    // Needed for Liquid
    network.assetHash,
  ).toHex();

  console.log(stringify({ refundTransaction }));
};
