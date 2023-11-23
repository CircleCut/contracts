// *** YOU ARE LIMITED TO THE FOLLOWING IMPORTS TO BUILD YOUR PHAT CONTRACT     ***
// *** ADDING ANY IMPORTS WILL RESULT IN ERRORS & UPLOADING YOUR CODE TO PHALA  ***
// *** NETWORK WILL FAIL. IF YOU WANT TO KNOW MORE, JOIN OUR DISCORD TO SPEAK   ***
// *** WITH THE PHALA TEAM AT https://discord.gg/5HfmWQNX THANK YOU             ***
// *** FOR DOCS ON HOW TO CUSTOMIZE YOUR PC 2.0 https://bit.ly/customize-pc-2-0 ***
import "@phala/pink-env";
import { Coders } from "@phala/ethers";

type HexString = `0x${string}`;

const uintCoder = new Coders.NumberCoder(32, false, "uint256");
const uintArrayCoder = new Coders.ArrayCoder(uintCoder, 10, "uint256");

function encodeReply(reply: [number, number, number]): HexString {
  return Coders.encode([uintCoder, uintCoder, uintCoder], reply) as HexString;
}

// Defined in OracleConsumerContract.sol
const TYPE_RESPONSE = 0;
const TYPE_ERROR = 2;

enum Error {
  BadRequestString = "BadRequestString",
  FailedToFetchData = "FailedToFetchData",
  FailedToDecode = "FailedToDecode",
  MalformedRequest = "MalformedRequest",
  IncorrectIdsAndAmounts = "IncorrectIdsAndAmounts",
}

function errorToCode(error: Error): number {
  switch (error) {
    case Error.BadRequestString:
      return 1;
    case Error.FailedToFetchData:
      return 2;
    case Error.FailedToDecode:
      return 3;
    case Error.MalformedRequest:
      return 4;
    case Error.IncorrectIdsAndAmounts:
      return 5;
    default:
      return 0;
  }
}

function fetchPriceConversion(
  currencyIds: number[],
  currencyAmounts: number[],
  parsedSecrets: any
): number {
  let headers = {
    "Content-Type": "application/json",
    "User-Agent": "phat-contract",
    "X-CMC_PRO_API_KEY": parsedSecrets.superSecret,
  };
  const filteredIds = currencyIds.filter((id) => id > 0);
  const filteredAmounts = currencyAmounts.filter((amount) => amount > 0);
  if (filteredIds.length !== filteredAmounts.length) {
    throw Error.IncorrectIdsAndAmounts;
  }
  const idString = filteredIds.join(",");
  let response = pink.batchHttpRequest(
    [
      {
        url: parsedSecrets.apiUrl + idString,
        method: "GET",
        headers,
        returnTextBody: true,
      },
    ],
    10000 // Param for timeout in milliseconds. Your Phat Contract script has a timeout of 10 seconds
  )[0]; // Notice the [0]. This is important bc the `pink.batchHttpRequest` function expects an array of up to 5 HTTP requests.
  if (response.statusCode !== 200) {
    console.log(
      `Fail to read CoinMarketCap api with status code: ${
        response.statusCode
      }, error: ${response.error || response.body}}`
    );
    throw Error.FailedToFetchData;
  }
  let respBody = response.body;
  if (typeof respBody !== "string") {
    throw Error.FailedToDecode;
  }
  const respData = JSON.parse(respBody);

  let prices = respData.data;
  let usdAmount = 0;
  currencyIds.forEach((id: number, index: number) => {
    usdAmount += prices[id.toString()].quote.USD.price * currencyAmounts[index];
  });
  return usdAmount;
}

export default function main(request: HexString, secrets: string): HexString {
  console.log(`handle req: ${request}`);
  let parsedSecrets = JSON.parse(secrets);
  // Uncomment to debug the `secrets` passed in from the Phat Contract UI configuration.
  // console.log(`secrets: ${secrets}`);
  let requestId: number, currencyIds: number[], currencyAmounts: number[];
  try {
    [requestId, currencyIds, currencyAmounts] = Coders.decode(
      [uintCoder, uintArrayCoder, uintArrayCoder],
      request
    );
  } catch (error) {
    console.info("Malformed request received");
    return encodeReply([TYPE_ERROR, 0, errorToCode(error as Error)]);
  }

  try {
    const usdAmount = fetchPriceConversion(
      currencyIds,
      currencyAmounts,
      parsedSecrets
    );

    return encodeReply([TYPE_RESPONSE, requestId, usdAmount]);
  } catch (error) {
    if (error === Error.FailedToFetchData) {
      throw error;
    } else {
      // otherwise tell client we cannot process it
      console.log("error:", [TYPE_ERROR, requestId, error]);
      return encodeReply([TYPE_ERROR, requestId, errorToCode(error as Error)]);
    }
  }
}
