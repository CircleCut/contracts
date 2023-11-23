import { ethers } from "hardhat";
import "dotenv/config";

async function main() {
  const PriceConversionContract = await ethers.getContractFactory(
    "PriceConversionContract"
  );

  const [deployer] = await ethers.getSigners();

  const consumerSC = process.env["MUMBAI_CONSUMER_CONTRACT_ADDRESS"] || "";
  const consumer = PriceConversionContract.attach(consumerSC);
  await Promise.all([consumer.deployed()]);

  console.log("Pushing a malformed request...");
  await consumer.connect(deployer).malformedRequest("0x01");
  console.log("Done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
