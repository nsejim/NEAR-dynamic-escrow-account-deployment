import { Worker, NearAccount, NEAR } from 'near-workspaces';
import anyTest, { TestFn } from 'ava';
import * as path from 'path';

const costMission = 500; // NEAR tokens
const percentageAdmin = 10; // 10%

const test = anyTest as TestFn<{
  worker: Worker;
  accounts: Record<string, NearAccount>;
}>;

test.beforeEach(async (t) => {
  // Init the worker and start a Sandbox server
  const worker = await Worker.init();

  const root = worker.rootAccount;

  const admin = await root.createSubAccount('admin',{
    initialBalance: NEAR.parse("50 N").toJSON(),
  });

  const client = await root.createSubAccount('client', {
    initialBalance: NEAR.parse("1000 N").toJSON(),
  });

  const talent = await root.createSubAccount('talent', {
    initialBalance: NEAR.parse("100 N").toJSON(),
  });

  await client.transfer(admin.accountId, NEAR.parse("500 N").toJSON())

  const contract = await admin.createSubAccount('escrow',{
    initialBalance: NEAR.parse("10 N").toJSON(),
  });

  // Get wasm file path from package.json test script in folder above
  await contract.deploy(
    path.join(__dirname,  "../../contracts/devshop-escrow/build/devshop_escrow.wasm")
  );
  
  // Act
  await admin.call(
      contract.accountId,
      "createMission",
      {
          clientWallet: client.accountId,
          talentWallet: talent.accountId,
          missionContentHash: "",
          dueDate:"22/12/2022",
          percentageAdmin
      }, {
          attachedDeposit: NEAR.parse(costMission.toString() + " N").toJSON(),
          gas: '300000000000000'
      }
  )

  // Save state for test runs, it is unique for each test
  t.context.worker = worker;
  t.context.accounts = { root, contract, admin, client, talent};
});

test.afterEach.always(async (t) => {
  // Stop Sandbox server
  await t.context.worker.tearDown().catch((error) => {
    console.log('Failed to stop the Sandbox:', error);
  });
});

test('Test create mission', async(t) => {
    // Arrange
    const { contract, admin } = t.context.accounts;
    const contractBalance = (await contract.balance()).available
    console.log(contractBalance.toHuman())
    // Assert
    const adminMission = await contract.view("getAdmin")
    t.is(adminMission, admin.accountId)

    const mission: any = await contract.view("getMission")
    t.is(mission.clientDeposit, costMission, "Deposit amount doesn't match")
    t.is(mission.tokenToPayTalent, costMission * (1 - percentageAdmin/100), "Wrong amount to pay the talent")
    t.is(mission.tokenToPayAdmin, costMission * (percentageAdmin/100), "Wrong commission for admin")
    t.is(mission.status, 0, "Wrong status of the contract")

})

test('Test mission lifecycle', async(t) => {
    let mission: any;

    // Arrange
    const { contract, client, talent, admin } = t.context.accounts;
    const adminBalanceBefore = (await admin.balance()).total
    

    // Accept mission
    await talent.call(contract.accountId, "acceptMission", {})
    mission = await contract.view("getMission")
    t.is(mission.status, 1, "Wrong status of the contract")

    // Start mission
    await client.call(contract.accountId, "startMission", {})
    mission = await contract.view("getMission")
    t.is(mission.status, 3, "Wrong status of the contract")

    // Complete mission
    await talent.call(contract.accountId, "completeMission", {})
    mission = await contract.view("getMission")
    t.is(mission.status, 5, "Wrong status of the contract")

    console.log(mission)

    // Pay mission
    await client.call(contract.accountId, "payMission", {}, {
      gas: '300000000000000'
    })
    mission = await contract.view("getMission")
    t.is(mission.status, 6, "Wrong status of the contract")

    const contractBalance = (await contract.balance()).available
    console.log(contractBalance.toHuman())
    const contractTotal = (await contract.balance()).total
    console.log(contractTotal.toHuman())

    const adminBalanceBeforeDelete = (await admin.balance()).total

    // Delete mission
    await admin.call(contract.accountId, "deleteContract", {}, {
      gas: '300000000000000'
    })

    const adminBalanceAfter = (await admin.balance()).total

    console.log(adminBalanceBefore.toHuman())
    console.log(adminBalanceBeforeDelete.toHuman())
    console.log(adminBalanceAfter.toHuman())


})