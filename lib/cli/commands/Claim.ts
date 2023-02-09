import { Arguments } from 'yargs';
import { constructClaimTransaction } from 'boltz-core';
import { constructClaimTransaction as constructClaimTransactionLiquid } from 'boltz-core-liquid';
import { prepareTx } from '../Command';
import BuilderComponents from '../BuilderComponents';
import { getHexBuffer, stringify } from '../../Utils';

export const command = 'claim <network> <preimage> <privateKey> <redeemScript> <rawTransaction> <destinationAddress> [feePerVbyte]';

export const describe = 'claims reverse submarine or chain to chain swaps';

export const builder = {
  network: BuilderComponents.network,
  privateKey: BuilderComponents.privateKey,
  redeemScript: BuilderComponents.redeemScript,
  rawTransaction: BuilderComponents.rawTransaction,
  destinationAddress: BuilderComponents.destinationAddress,
  preimage: {
    describe: 'preimage of the swap',
    type: 'string',
  },
  feePerVbyte: BuilderComponents.feePerVbyte,
};

export const handler = (argv: Arguments<any>): void => {
  const {
    keys,
    network,
    isLiquid,
    swapOutput,
    transaction,
    redeemScript,
    destinationAddress,
  } = prepareTx(argv);

  const claimTransaction = (isLiquid ? constructClaimTransactionLiquid : constructClaimTransaction)(
    [{
      ...swapOutput,
      keys,
      redeemScript,
      txHash: transaction.getHash(),
      preimage: getHexBuffer(argv.preimage),
    } as any],
    destinationAddress,
    argv.feePerVbyte,
    true,
    // Needed for Liquid
    network.assetHash,
  ).toHex();

  console.log(stringify({ claimTransaction }));
};
