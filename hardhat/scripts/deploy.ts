/* eslint-disable node/no-missing-import */
import {
  AsenToken,
  Petty,
  TokenSale,
  Reserve,
  Marketplace,
} from "./../typechain";
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

async function main() {
  const INITIAL_SUPPLY = 10000000;
  const DEFAULT_FEE_DECIMAL = 0;
  const DEFAULT_FEE_RATE = 10;
  // deploy ase
  const AsenToken = await ethers.getContractFactory("AsenToken");
  const ase: AsenToken = await AsenToken.deploy(INITIAL_SUPPLY);
  await ase.deployed();
  console.log("ASE deploy to: ", ase.address);

  // deploy petty
  const Petty = await ethers.getContractFactory("Petty");
  const petty: Petty = await Petty.deploy();
  await petty.deployed();
  console.log("Petty deploy to: ", petty.address);

  // deploy token sale
  const TokenSale = await ethers.getContractFactory("TokenSale");
  const tokenSale: TokenSale = await TokenSale.deploy(ase.address);
  await tokenSale.deployed();
  const transferTx = await ase.transfer(
    tokenSale.address,
    ethers.utils.parseEther("1000000")
  );
  await transferTx.wait();
  console.log("TokenSale deploy to: ", tokenSale.address);

  // deploy Reserve
  const Reserve = await ethers.getContractFactory("Reserve");
  const reserve: Reserve = await Reserve.deploy(ase.address);
  await reserve.deployed();
  console.log("Reserve deploy to: ", reserve.address);

  // deploy marketplace
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace: Marketplace = await Marketplace.deploy(
    petty.address,
    DEFAULT_FEE_DECIMAL,
    DEFAULT_FEE_RATE,
    reserve.address
  );
  await marketplace.deployed();
  console.log("Marketplace deploy to: ", marketplace.address);

  // ADD PAYMENT TOKEN
  const addPaymentTx = await marketplace.addPaymentToken(ase.address);
  await addPaymentTx.wait();
  console.log(
    "Gold is payment token for marketplace ? : ",
    await marketplace.isPaymentTokenSupported(ase.address)
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
