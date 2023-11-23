// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@phala/solidity/contracts/PhatRollupAnchor.sol";

contract PriceConversionContract is PhatRollupAnchor, Ownable {
    event ResponseReceived(uint reqId, RequestData reqData, uint256 value);
    event ErrorReceived(uint reqId, RequestData reqData, uint256 errno);

    enum Status{
        DOES_NOT_EXIST,
        REQUESTED,
        RESPONDED,
        ERROR
    }

    struct RequestData{
        uint[10] currencyIds;
        uint[10] currencyAmounts;
    }

    struct ResponseData{
        uint256 requestId;
        address caller;
        uint256 usdcAmount;
        Status status;
    }

    uint constant TYPE_RESPONSE = 0;
    uint constant TYPE_ERROR = 2;

    mapping(uint => RequestData) requests;
    mapping(address => ResponseData) latestResponse;
    uint nextRequest = 1;

    constructor(address phatAttestor) {
        _grantRole(PhatRollupAnchor.ATTESTOR_ROLE, phatAttestor);
    }

    function setAttestor(address phatAttestor) public {
        _grantRole(PhatRollupAnchor.ATTESTOR_ROLE, phatAttestor);
    }

    function request(uint[10] memory currencyIds,uint[10] memory currencyAmounts) public {
        // assemble the request
        uint id = nextRequest;
        requests[id] = RequestData(currencyIds,currencyAmounts);
        latestResponse[msg.sender] = ResponseData(id,msg.sender,0,Status.REQUESTED);
        _pushMessage(abi.encode(id, currencyIds,currencyAmounts));
        nextRequest += 1;
    }


    function _onMessageReceived(bytes calldata action) internal override {
        (uint respType, uint id, uint256 usdcAmount) = abi.decode(
            action,
            (uint, uint, uint256)
        );
        if (respType == TYPE_RESPONSE) {
            emit ResponseReceived(id, requests[id], usdcAmount);
            latestResponse[msg.sender] = ResponseData(id,msg.sender,usdcAmount,Status.RESPONDED);
            delete requests[id];
        } else if (respType == TYPE_ERROR) {
            emit ErrorReceived(id, requests[id], usdcAmount);
            delete requests[id];
        }
    }

    function getLatestResponseStatus() public view returns(uint256)
    {
        return uint256(latestResponse[msg.sender].status);
    }

    function getLatestResponseUSDC()public view returns(uint256)
    {
       return latestResponse[msg.sender].usdcAmount;
    }
}
