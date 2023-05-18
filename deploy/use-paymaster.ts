import { Provider, utils, Wallet } from 'zksync-web3';
import * as ethers from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

// Put the address of the deployed paymaster here
const PAYMASTER_ADDRESS = '0x860910c7141978B6DCe2e8090EfF4B7faFb2B667';

// Put the address of the ERC20 token here:
const TOKEN_ADDRESS = '0xD8C134aA59e62C5fFfB649D246ED6E04Ed913B2b';

// Wallet private key
const EMPTY_WALLET_PRIVATE_KEY = '0x6933eb119d883cc214e4bf379d01fd388bf36cbe34eb620634a78fb21c66b013';

function getToken(hre: HardhatRuntimeEnvironment, wallet: Wallet) {
  const artifact = hre.artifacts.readArtifactSync('MyERC20');
  return new ethers.Contract(TOKEN_ADDRESS, artifact.abi, wallet);
}

export default async function (hre: HardhatRuntimeEnvironment) {
  const provider = new Provider(hre.config.zkSyncDeploy.zkSyncNetwork);
  const emptyWallet = new Wallet(EMPTY_WALLET_PRIVATE_KEY, provider);

  // Obviously this step is not required, but it is here purely to demonstrate
  // that indeed the wallet has no ether.
  // const ethBalance = await emptyWallet.getBalance();
  // if (!ethBalance.eq(0)) {
  //   throw new Error('The wallet is not empty');
  // }

  console.log(
    `Balance of the user before mint: ${await emptyWallet.getBalance(
      TOKEN_ADDRESS
    )}`
  );

  const erc20 = getToken(hre, emptyWallet);

  const gasPrice = await provider.getGasPrice();

  // Estimate gas fee for mint transaction
  const gasLimit = await erc20.estimateGas.mint(emptyWallet.address, 100, {
    customData: {
      ergsPerPubdata: utils.DEFAULT_ERGS_PER_PUBDATA_LIMIT,
      paymasterParams: {
        paymaster: PAYMASTER_ADDRESS,
        paymasterInput: '0x',
      },
    },
  });

  const fee = gasPrice.mul(gasLimit.toString());

  // Encoding the "ApprovalBased" paymaster flow's input
  const paymasterParams = utils.getPaymasterParams(PAYMASTER_ADDRESS, {
    type: 'ApprovalBased',
    token: TOKEN_ADDRESS,
    // set minimalAllowance as we defined in the paymaster contract
    minimalAllowance: ethers.BigNumber.from(1),
    innerInput: new Uint8Array(),
  });

  await (
    await erc20.mint(emptyWallet.address, 100, {
      // provide gas params manually
      maxFeePerGas: gasPrice,
      maxPriorityFeePerGas: gasPrice,
      gasLimit,

      // paymaster info
      customData: {
        paymasterParams,
        ergsPerPubdata: utils.DEFAULT_ERGS_PER_PUBDATA_LIMIT,
      },
    })
  ).wait();

  console.log(
    `Balance of the user after mint: ${await emptyWallet.getBalance(
      TOKEN_ADDRESS
    )}`
  );
}
