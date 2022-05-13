import { near, log, BigInt, json, JSONValueKind } from "@graphprotocol/graph-ts";
import { Account, Swap, AddLiquidity, Transaction, Pair } from "../generated/schema";

export function handleReceipt(receipt: near.ReceiptWithOutcome): void {
  const actions = receipt.receipt.actions;
  
  for (let i = 0; i < actions.length; i++) {
    handleAction(
      actions[i], 
      receipt.receipt, 
      receipt.block.header,
      receipt.outcome
      );
  }
}

function handleAction(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  blockHeader: near.BlockHeader,
  outcome: near.ExecutionOutcome
): void {
  
  if (action.kind != near.ActionKind.FUNCTION_CALL) {
    log.info("Early return: {}", ["Not a function call"]);
    return;
  }
  
  let accounts = new Account(receipt.signerId);
  const functionCall = action.toFunctionCall();

  if (functionCall.methodName == "swap") {
    const receiptId = receipt.id.toHexString();
    accounts.signerId = receipt.signerId;
    accounts.timestamp = BigInt.fromU64(blockHeader.timestampNanosec/1000000000)

    let logs = new Swap(`${receiptId}`); // Initializing Swap entity
    let transaction = new Transaction(`${receiptId}`); // Initializing Transaction entity
    let pair = new Pair(`${receiptId}`); // Initializing Pair entity

    if(outcome.logs[0]!= null){
      let rawString = outcome.logs[0]
      let splitString = rawString.split(' ')
      // Filling Swap entity
        logs.id = receipt.signerId;
        logs.action = splitString[0].toString()
        // Filling Transaction entity
          transaction.id = receipt.signerId;
          transaction.timestamp = BigInt.fromU64(blockHeader.timestampNanosec/1000000000)
          transaction.save()
        logs.transaction = transaction.id
        logs.timestamp = BigInt.fromU64(blockHeader.timestampNanosec/1000000000)
        // Filling Pair entity
          pair.id = "1" // STILL TO BE DEFINED
          pair.token0 = splitString[2].toString()
          pair.token1 = splitString[5].toString()
          pair.save()
        logs.pair = pair.id
        logs.from = receipt.signerId
        logs.to = receipt.receiverId
        logs.amount0In = BigInt.fromString(splitString[1])
        logs.amount1In = BigInt.fromString("0")
        logs.amount0Out = BigInt.fromString("0")
        logs.amount1Out = BigInt.fromString(splitString[4])
      logs.save()
    }

  } else {
    log.info("Not processed - FunctionCall is: {}", [functionCall.methodName]);
  }

   if (functionCall.methodName == "add_liquidity") {
    const receiptId = receipt.id.toHexString();
      accounts.signerId = receipt.signerId;

      let liquidity = new AddLiquidity(`${receiptId}`);
      if(outcome.logs[0]!= null){
        liquidity.id = receipt.signerId;
        liquidity.output = outcome.logs[0]
        liquidity.timestamp = BigInt.fromU64(blockHeader.timestampNanosec/1000000000)
        let rawString = outcome.logs[0]
        let splitString = rawString.split(' ')
        liquidity.functionCalled = functionCall.methodName
        liquidity.functionAction = (splitString[0] + ' ' + splitString[1])
        liquidity.firstPoolAmount = BigInt.fromString(splitString[2].split('"')[1])
        liquidity.firstPool = splitString[3].slice(0, -2)
        liquidity.secondPoolAmount = BigInt.fromString(splitString[4].split('"')[1])
        liquidity.secondPool = splitString[5].slice(0, -3)
        liquidity.sharesMinted = BigInt.fromString(splitString[7])

        liquidity.save()
      }
  } else {
    log.info("Not processed - FunctionCall is: {}", [functionCall.methodName]);
  }

  accounts.save();
}
