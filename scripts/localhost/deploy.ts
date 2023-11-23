import { ethers } from "hardhat";
import "dotenv/config";

async function main() {
  const PriceConversionContract = await ethers.getContractFactory(
    "PriceConversionContract"
  );

  const [deployer] = await ethers.getSigners();

  console.log("Deploying...");
  const consumer = await PriceConversionContract.deploy(deployer.address);
  await consumer.deployed();
  console.log("Deployed", {
    consumer: consumer.address,
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
