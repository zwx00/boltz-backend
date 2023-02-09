import { Arguments } from 'yargs';
import { detectSwap } from 'boltz-core';
import { credentials } from '@grpc/grpc-js';
import { address, Transaction } from 'bitcoinjs-lib';
import { Networks, detectSwap as detectSwapLiquid } from 'boltz-core-liquid';
import { address as addressLiquid, Transaction as TransactionLiquid } from 'liquidjs-lib';
import { getHexBuffer } from '../Utils';
import { ECPair } from '../ECPairHelper';
import { BoltzClient } from '../proto/boltzrpc_grpc_pb';

export interface GrpcResponse {
  toObject: () => any;
}

export const loadBoltzClient = (argv: Arguments<any>): BoltzClient => {
  return new BoltzClient(`${argv.rpc.host}:${argv.rpc.port}`, credentials.createInsecure());
};

export const callback = (error: Error | null, response: GrpcResponse): void => {
  if (error) {
    printError(error);
  } else {
    const responseObj = response.toObject();
    if (Object.keys(responseObj).length === 0) {
      console.log('success');
    } else {
      printResponse(responseObj);
    }
  }
};

export const prepareTx = (argv: Arguments<any>) => {
  const network = Networks[argv.network];

  const redeemScript = getHexBuffer(argv.redeemScript);

  const isLiquid = argv.network.includes('liquid');

  const transaction = isLiquid ?
    TransactionLiquid.fromHex(argv.rawTransaction) :
    Transaction.fromHex(argv.rawTransaction);

  const swapOutput = isLiquid ?
    detectSwapLiquid(redeemScript, transaction as any) :
    detectSwap(redeemScript, transaction as any);

  return {
    network,
    isLiquid,
    swapOutput,
    transaction,
    redeemScript,
    keys: ECPair.fromPrivateKey(getHexBuffer(argv.privateKey)),
    destinationAddress: (isLiquid ? addressLiquid : address).toOutputScript(argv.destinationAddress, network),
  };
};

export const printResponse = (response: unknown): void => {
  console.log(JSON.stringify(response, undefined, 2));
};

export const printError = (error: Error): void => {
  console.error(`${error.name}: ${error.message}`);
};
