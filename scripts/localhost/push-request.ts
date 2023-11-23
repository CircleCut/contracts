import { ethers } from "hardhat";
import "dotenv/config";

async function main() {
  const PriceConversionContract = await ethers.getContractFactory(
    "PriceConversionContract"
  );

  const [deployer] = await ethers.getSigners();

  const consumerSC = process.env["LOCALHOST_CONSUMER_CONTRACT_ADDRESS"] || "";
  if (!consumerSC) {
    console.error("Error: Please provide LOCALHOST_CONSUMER_CONTRACT_ADDRESS");
    process.exit(1);
  }
  const consumer = PriceConversionContract.attach(consumerSC);
  console.log("Pushing a request...");
  await consumer
    .connect(deployer)
    .request(
      [1, 2, 3, 4, 5, 0, 0, 0, 0, 0],
      [
        500000000000000, 5000000000, 54545, 325000000000, 1100000000000, 0, 0,
        0, 0, 0,
      ]
    );
  consumer.on(
    "ResponseReceived",
    async (reqId: number, pair: string, value: string) => {
      console.info("Received event [ResponseReceived]:", {
        reqId,
        pair,
        value,
      });
      process.exit();
    }
  );
  consumer.on(
    "ErrorReceived",
    async (reqId: number, pair: string, value: string) => {
      console.info("Received event [ErrorReceived]:", {
        reqId,
        pair,
        value,
      });
      process.exit();
    }
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
