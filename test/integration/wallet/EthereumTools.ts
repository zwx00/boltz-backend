import { ContractABIs } from 'boltz-core';
import { ERC20 } from 'boltz-core/typechain/ERC20';
import { EtherSwap } from 'boltz-core/typechain/EtherSwap';
import { ERC20Swap } from 'boltz-core/typechain/ERC20Swap';
import { BigNumber, Contract, providers, Signer, Wallet } from 'ethers';

export const getSigner = (): { provider: providers.WebSocketProvider, signer: Signer, etherBase: Signer } => {
  const provider = new providers.WebSocketProvider('http://127.0.0.1:8546');

  return {
    provider,
    signer: Wallet.createRandom().connect(provider),
    etherBase: provider.getSigner(0),
  };
};

export const getTokenContract = (signer: Signer): ERC20 => {
  return new Contract('0x5bEFc41A78Fb5821101dbc6C43Aa3FD2306Ff644', ContractABIs.ERC20, signer) as any as ERC20;
};

export const getSwapContracts = (signer: Signer): { etherSwap: EtherSwap, erc20Swap: ERC20Swap } => {
  return {
    etherSwap: new Contract('0x28F472289cB2682e203d861A312d25D514fAA2EF', ContractABIs.EtherSwap, signer) as any as EtherSwap,
    erc20Swap: new Contract('0xe0FfDCAAdc5de7b2b6C05173879c18322a49092E', ContractABIs.ERC20Swap, signer) as any as ERC20Swap,
  };
};

export const fundSignerWallet = async (signer: Signer, etherBase: Signer, token?: ERC20): Promise<void> => {
  const signerAddress = await signer.getAddress();

  const etherFundingTransaction = await etherBase.sendTransaction({
    to: signerAddress,
    value: BigNumber.from(10).pow(18),
  });

  await etherFundingTransaction.wait(1);

  if (token) {
    const tokenFundingTransaction = await token.connect(etherBase).transfer(
      signerAddress,
      BigNumber.from(10).pow(18),
    );

    await tokenFundingTransaction.wait(1);
  }
};

export const waitForTransactionHash = async (provider: providers.WebSocketProvider,  transactionHash: string): Promise<void> => {
  const transaction = await provider.getTransaction(transactionHash);
  await transaction.wait(1);
};
