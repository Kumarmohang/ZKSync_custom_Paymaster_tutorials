import { utils, Wallet } from 'zksync-web3';
import * as ethers from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Deployer } from '@matterlabs/hardhat-zksync-deploy';

export default async function (hre: HardhatRuntimeEnvironment) {
  // The wallet that will deploy the token and the paymaster
  // It is assumed that this wallet already has sufficient funds on zkSync
  const wallet = new Wallet('0x6933eb119d883cc214e4bf379d01fd388bf36cbe34eb620634a78fb21c66b013');

  // The wallet that will receive ERC20 tokens
  // const emptyWallet = Wallet.createRandom();
  // console.log(`Empty wallet's address: ${emptyWallet.address}`);
  // console.log(`Empty wallet's private key: ${emptyWallet.privateKey}`);

  const deployer = new Deployer(hre, wallet);

  // Deploying the ERC20 token
  const erc20Artifact = await deployer.loadArtifact('MyERC20');
  const erc20 = await deployer.deploy(erc20Artifact, [
    'Amrit',
    'AMR',
    18,
  ]);
  console.log(`ERC20 address: ${erc20.address}`);



  // Deploying the paymaster
  const paymasterArtifact = await deployer.loadArtifact('MyPaymaster');
  const paymaster = await deployer.deploy(paymasterArtifact, [erc20.address]);
  console.log(`Paymaster address: ${paymaster.address}`);

  // Supplying paymaster with ETH
  await (
    await deployer.zkWallet.sendTransaction({
      to: paymaster.address,
      value: ethers.utils.parseEther('0.03'),
    })
  ).wait();

  // Supplying the ERC20 tokens to the empty wallet:
  await // We will give the empty wallet 3 units of the token:
  (await erc20.mint("0x5d21B70da363B8cc8b89d93fBF46cDdd527Fb245", 1000000000000000)).wait();

  console.log('Minted 100000000000000 tokens for the empty wallet');

  console.log(`Done!`);
}
