import { Worker, NearAccount, NEAR } from 'near-workspaces';
import anyTest, { TestFn } from 'ava';

const test = anyTest as TestFn<{
  worker: Worker;
  accounts: Record<string, NearAccount>;
}>;

test.beforeEach(async (t) => {
  // Init the worker and start a Sandbox server
  const worker = await Worker.init();

  // Deploy contract
  const root = worker.rootAccount;

  const contract = await root.createSubAccount('main');

  // Get wasm file path from package.json test script in folder above
  await contract.deploy(
    "/Users/nsejim/Documents/Workdir/near-escrow/escrow-js-vanilla/contracts/devshop-main/build/devshop_main.wasm"
  );

  const client = await root.createSubAccount('client', {
    initialBalance: NEAR.parse("1000 N").toJSON(),
  });
  const talent = await root.createSubAccount('talent');

  // Save state for test runs, it is unique for each test
  t.context.worker = worker;
  t.context.accounts = { root, contract, client, talent};
});

test.afterEach.always(async (t) => {
  // Stop Sandbox server
  await t.context.worker.tearDown().catch((error) => {
    console.log('Failed to stop the Sandbox:', error);
  });
});

test('Test mission contract initialisation', async(t) => {
  // Arrange
  const { root, contract, client, talent} = t.context.accounts;

  const missionId = "111111";
  // Act
  await client.call(
    contract.accountId,
    'createMission',
    {
      missionId,
      talentWallet: talent.accountId,
      missionContentHash: "",
      dueDate: "22/11/2022"
    }, {
      attachedDeposit: NEAR.parse("500 N").toJSON(),
      gas: '300000000000000'
    }
  )

  // Assert
  const missions: any = await contract.view("getMissions", {} );
  const missionAccountId = `${missionId}.${contract.accountId}`;

  t.true(missions && (missions.length === 1), "Mission not created")
  t.is(missions[0].accountId, missionAccountId, "Mission not found")

  const missionAccount = root.getAccount(missionAccountId)
  t.true(await missionAccount.exists(), "Mission contract doesn't exist")
})


test('Test mission contract state', async(t) => {

    // Arrange
    const { root, contract, client, talent} = t.context.accounts;
    const costMission = 500; // NEAR tokens
    const percentageAdmin = 10; // 10%

    const missionId = "111111";
    // Act
    await client.call(
      contract.accountId,
      'createMission',
      {
        missionId,
        talentWallet: talent.accountId,
        missionContentHash: "",
        dueDate: "22/11/2022"
      }, {
        attachedDeposit: NEAR.parse(costMission.toString() + " N").toJSON(),
        gas: '300000000000000'
      }
    )

    const missionAccountId = `${missionId}.${contract.accountId}`;
    const missionAccount = root.getAccount(missionAccountId)
    
    const mission: any = await missionAccount.view("getMission")
    t.is(mission.clientDeposit, costMission, "Deposit amount doesn't match")
    t.is(mission.tokenToPayTalent, costMission * (1 - percentageAdmin/100), "Wrong amount to pay the talent")
    t.is(mission.tokenToPayAdmin, costMission * (percentageAdmin/100), "Wrong commission for admin")
    t.is(mission.status, 0, "Wrong status of the contract")

})


test('Test mission contract is locked', async(t)=> {
   // Arrange
   const { root, contract, client, talent} = t.context.accounts;
   const costMission = 500; // NEAR tokens
   const percentageAdmin = 10; // 10%

   const missionId = "111111";
   // Act
   await client.call(
     contract.accountId,
     'createMission',
     {
       missionId,
       talentWallet: talent.accountId,
       missionContentHash: "",
       dueDate: "22/11/2022"
     }, {
       attachedDeposit: NEAR.parse(costMission.toString() + " N").toJSON(),
       gas: '300000000000000'
     }
   )

   const missionAccountId = `${missionId}.${contract.accountId}`;
   const missionAccount = root.getAccount(missionAccountId)

   t.is(await missionAccount.getKey(), null , "Contract is not locked")
})
