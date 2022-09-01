import { Arguments } from 'yargs';
import { address, Transaction } from 'bitcoinjs-lib';
import { address as addressLiquid, Transaction as TransactionLiquid } from 'liquidjs-lib';
import { constructClaimTransaction, detectSwap } from 'boltz-core';
import { Networks, constructClaimTransaction as constructClaimTransactionLiquid, detectSwap as detectSwapLiquid } from 'boltz-core-liquid';
import { ECPair } from '../../ECPairHelper';
import BuilderComponents from '../BuilderComponents';
import { getHexBuffer, stringify } from '../../Utils';

export const command = 'claim <network> <preimage> <privateKey> <redeemScript> <rawTransaction> <destinationAddress>';

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
};

export const handler = (argv: Arguments<any>): void => {
  const network = Networks[argv.network];

  const redeemScript = getHexBuffer(argv.redeemScript);

  let claimTransaction: string;

  if (argv.network.includes('liquid')) {
    const transaction = TransactionLiquid.fromHex(argv.rawTransaction);
    const swapOutput = detectSwapLiquid(redeemScript, transaction)!;

    claimTransaction = constructClaimTransactionLiquid(
      [{
        ...swapOutput,
        txHash: transaction.getHash(),
        preimage: getHexBuffer(argv.preimage),
        redeemScript: getHexBuffer(argv.redeemScript),
        keys: ECPair.fromPrivateKey(getHexBuffer(argv.privateKey)),
      }],
      addressLiquid.toOutputScript(argv.destinationAddress, network),
      2,
      true,
      network.assetHash,
    ).toHex();
  } else {
    const transaction = Transaction.fromHex(argv.rawTransaction);
    const swapOutput = detectSwap(redeemScript, transaction)!;

    claimTransaction = constructClaimTransaction(
      [{
        ...swapOutput,
        txHash: transaction.getHash(),
        preimage: getHexBuffer(argv.preimage),
        redeemScript: getHexBuffer(argv.redeemScript),
        keys: ECPair.fromPrivateKey(getHexBuffer(argv.privateKey)),
      }],
      address.toOutputScript(argv.destinationAddress, network),
      2,
      true,
    ).toHex();
  }

  console.log(stringify({ claimTransaction }));
};
