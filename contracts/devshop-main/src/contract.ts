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
    talentWallet: string
  }>;

  constructor() {
    this.missions = new Vector<{
      missionId: string,
      clientWallet: string,
      talentWallet: string
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
        percentageAdmin: 0 as unknown as bigint,
        minDeposit: 0 as unknown as bigint
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
    clientWallet
   }) {
    this.missions.push({ 
      missionId,
      talentWallet,
      clientWallet
     })
  }

  @view({})
  getMissions({
    accountId, 
    initDataOnly
  }: {
    accountId?: string, 
    active?: boolean, 
    initDataOnly?: boolean
  }): string {
      if (accountId) {
        return JSON.stringify(this.missions.toArray().filter(mission => {
          return mission.clientWallet === accountId || mission.talentWallet === accountId
        }))
      }
      return JSON.stringify(this.missions.toArray().map(async (mission) => {
        if (initDataOnly) {
          return {
            ...mission,
            initData: this._getMissionInitData(mission.missionId)
          }
        }
        return {
          ...mission,
          ...JSON.parse(await this._getMissionData(mission.missionId))
        }
      }))
  }

  _getMissionInitData(missionId: string): NearPromise {
    const promise = NearPromise.new(`${missionId}.${near.currentAccountId()}`)
    .functionCall("getInitData", NO_ARGS, NO_DEPOSIT, DEFAULT_TGAS)    
    return promise.asReturn();
  }

  _getMissionData(missionId: string): string {
    const promise = near.promiseBatchCreate(`${missionId}.${near.currentAccountId()}`);
    near.promiseBatchActionFunctionCall(
      promise,
      "getMission",
      NO_ARGS, NO_DEPOSIT, DEFAULT_TGAS
    );  
    return near.promiseResult(promise);
  }

  _checkUniqueMissionId(missionId: string): boolean {
    return !this.missions.toArray().find(mission => mission.missionId === missionId);
  }
}