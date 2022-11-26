import { Worker, NearAccount, NEAR } from 'near-workspaces';
import anyTest, { TestFn } from 'ava';
import * as path from 'path';

const test = anyTest as TestFn<{
  worker: Worker;
  accounts: Record<string, NearAccount>;
}>;

test.beforeEach(async (t) => {
  // Init the worker and start a Sandbox server
  const worker = await Worker.init();

  // Deploy contract
  const root = worker.rootAccount;

  const contract = await root.createSubAccount('devshop');

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

/*test('contract initialised', async(t) => {
  // Arrange
  const { contract, client, talent, root } = t.context.accounts;


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
  const missions = JSON.parse(await contract.view("getMissions", {} ));

  console.log(missions)

  t.is(missions.length, 1, "Should contains one mission")
})
*/

