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

function encodeReply(reply: [number, number, bigint]): HexString {
  return Coders.encode([uintCoder, uintCoder, uintCoder], reply) as HexString;
}

// Defined in PriceConversionContract.sol
const TYPE_RESPONSE = 0;
const TYPE_ERROR = 2;

enum Error {
  BadRequestString = "BadRequestString",
  FailedToFetchData = "FailedToFetchData",
  FailedToDecode = "FailedToDecode",
  MalformedRequest = "MalformedRequest",
  IncorrectIdsAndAmounts = "IncorrectIdsAndAmounts",
}

function errorToCode(error: Error): bigint {
  switch (error) {
    case Error.BadRequestString:
      return 1n;
    case Error.FailedToFetchData:
      return 2n;
    case Error.FailedToDecode:
      return 3n;
    case Error.MalformedRequest:
      return 4n;
    case Error.IncorrectIdsAndAmounts:
      return 5n;
    default:
      return 0n;
  }
}

function fetchPriceConversion(
  currencyIds: any[],
  currencyAmounts: any[],
  parsedSecrets: any
): bigint {
  let headers = {
    "Content-Type": "application/json",
    "User-Agent": "phat-contract",
    "X-CMC_PRO_API_KEY": parsedSecrets.superSecret,
  };
  console.log("headers:", headers);
  const filteredIds = [];
  let index = 0;
  while (index < currencyIds.length) {
    if (currencyIds[index] > 0n) filteredIds.push(currencyIds[index]);
    else break;
    index++;
  }
  console.log("filtering amounts");
  const filteredAmounts = currencyAmounts.slice(0, index).map((amount) => {
    let stringAmount = amount.toString();
    let amountLength = stringAmount.length;
    console.log("amountLength:", amountLength);
    if (amountLength > 18)
      return (
        stringAmount.slice(0, amountLength - 18) +
        "." +
        stringAmount.slice(amountLength - 18, amountLength)
      );
    else {
      return "0." + stringAmount.padStart(18, "0");
    }
  });
  console.log("filteredIds:", filteredIds);
  console.log("filteredAmounts:", filteredAmounts);

  console.log("filteredIds.length:", filteredIds.length);
  const idString = filteredIds.join(",");
  console.log("idString:", idString);
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
  filteredIds.forEach((id: number, index: number) => {
    console.log(
      "price for id:",
      id,
      " =>",
      prices[id.toString()].quote.USD.price
    );
    usdAmount +=
      prices[id.toString()].quote.USD.price * Number(filteredAmounts[index]);
  });

  const usdAmountArray = usdAmount.toString().split(".");
  const modifiedUsdAmount = BigInt(
    usdAmountArray[0] + usdAmountArray[1].padEnd(18, "0")
  );
  console.log("usdAmount:", modifiedUsdAmount);
  return modifiedUsdAmount;
}

export default function main(request: HexString, secrets: string): HexString {
  console.log(`handle req: ${request}`);
  let parsedSecrets = JSON.parse(secrets);
  // Uncomment to debug the `secrets` passed in from the Phat Contract UI configuration.
  // console.log(`secrets: ${secrets}`);
  let requestId, currencyIds, currencyAmounts;
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
    console.log("Going into fetchPriceConversion");
    console.log("currencyIds:", currencyIds);
    console.log("currencyAmounts:", currencyAmounts);
    console.log(typeof currencyAmounts[0]);
    console.log(currencyAmounts[0] / 1000000000000000000n);
    const usdAmount = fetchPriceConversion(
      currencyIds,
      currencyAmounts,
      parsedSecrets
    );
    console.log("FetchPriceConversion done");
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
