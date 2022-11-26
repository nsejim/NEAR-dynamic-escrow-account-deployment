// Find all our documentation at https://docs.near.org
import { NearBindgen, near, call, view, Vector, NearPromise, bytes, includeBytes } from 'near-sdk-js';
import { assert } from 'near-sdk-js';

const DEFAULT_TGAS = BigInt("100000000000000");
const NO_DEPOSIT = BigInt(0);
const NO_ARGS = bytes(JSON.stringify({}));
@NearBindgen({})
class DevshopMain {

  missions: Vector<{
    missionId: string,
    clientWallet: string,
    talentWallet: string,
    accountId: string
  }>;

  constructor() {
    this.missions = new Vector<{
      missionId: string,
      clientWallet: string,
      talentWallet: string,
      accountId: string
    }>('m');
  }

  @call({payableFunction: true})
  createMission({
    missionId,
    talentWallet,
    missionContentHash,
    dueDate
  }: {
    missionId: string,
    talentWallet: string,
    missionContentHash: string,
    dueDate: string
  }) {

    assert(this._checkUniqueMissionId(missionId) === true, "Mission ID should be unique");
    near.log("create mission")
    const amount = near.attachedDeposit();
    const promise = near.promiseBatchCreate(`${missionId}.${near.currentAccountId()}`);
    near.promiseBatchActionCreateAccount(
      promise
    )
    near.promiseBatchActionDeployContract(
      promise,
      includeBytes('../../devshop-escrow/build/devshop_escrow.wasm')
    )
    near.promiseBatchActionFunctionCall(
      promise,
      "createMission",
      bytes(JSON.stringify({ 
        clientWallet: near.predecessorAccountId(),
        talentWallet,
        missionContentHash,
        dueDate,
        percentageAdmin: 10 as unknown as bigint
      })),
      amount,
      100000000000000
    );
    
    near.promiseThen(
      promise,
      near.currentAccountId(),
      "_on_successfull_mission_create",
      bytes(JSON.stringify({
        missionId,
        talentWallet,
        clientWallet: near.predecessorAccountId(),
        accountId: `${missionId}.${near.currentAccountId()}`
      })),
      0,
      30000000000000
    );

    return near.promiseReturn(promise)
  }

  @call({ privateFunction: true })
  _on_successfull_mission_create({ 
    missionId,
    talentWallet,
    clientWallet,
    accountId
   }) {
    this.missions.push({ 
      missionId,
      talentWallet,
      clientWallet,
      accountId
     })
  }

  @view({})
  getMissions({
    accountId, 
    active
  }: {
    accountId?: string, 
    active?: boolean
  }) {
      if (accountId) {
        return this.missions.toArray().filter(mission => {
          return mission.clientWallet === accountId || mission.talentWallet === accountId
        })
      }
      return this.missions.toArray()
  }

  _checkUniqueMissionId(missionId: string): boolean {
    return !this.missions.toArray().find(mission => mission.missionId === missionId);
  }

}