// Find all our documentation at https://docs.near.org
import { NearBindgen, near, call, view, initialize, assert } from 'near-sdk-js';
import { Mission, MissionStatus, IMission } from './models/mission';

const YOCTO = BigInt("1000000000000000000000000") as bigint;
@NearBindgen({ requireInit: true })
export class DevshopEscrow {

  admin: string = "";
  mission: Mission = new Mission(null, null, null, null, null, null);

  @initialize({})
  @call({ payableFunction: true })
  createMission({
    clientWallet,
    talentWallet,
    missionContentHash,
    dueDate,
    percentageAdmin
  }: IMission) {

    assert(!this.admin, "Contract already initialized")

    this.admin = near.signerAccountId();
    near.log('Escrow contract initialized')

    const amount = near.attachedDeposit()
    assert(amount > 0, 'The attached deposit should be greater than zero')

    this.mission = new Mission(
      clientWallet,
      talentWallet,
      missionContentHash,
      Number(String(amount).slice(0, -24)),
      dueDate,
      percentageAdmin);

    near.log(`Mission created, waiting the talent to accept`)
  }

  @call({})
  acceptMission() {

    // assert(near.signerAccountId() === this.admin, 'Only admin can call this method')
    assert(near.predecessorAccountId() === this.mission.talentWallet, 'Only talent can accept mission')
    assert(this.mission.status === MissionStatus.WaitingTalentAcceptance, "Mission must be in a status waiting acceptance")

    this.mission.status = MissionStatus.Accepted;
    this.mission.acceptedOn = near.blockTimestamp();
    near.log(`Talent accepted the mission`)
    
  }

  @call({})
  startMission() {

    // assert(near.signerAccountId() === this.admin, 'Only admin can call this method')
    assert(near.predecessorAccountId() === this.mission.clientWallet, 'Only client can start the mission')
    assert(this.mission.status === MissionStatus.Accepted, "Mission must have been accepted by talent to start")

    this.mission.status = MissionStatus.Active;
    this.mission.activeSince = near.blockTimestamp();
    near.log(`The contract is now active`)
   
  }


  @call({})
  cancelMission() {
    // assert(near.signerAccountId() === this.admin, 'Only admin can call this method')
    assert((near.predecessorAccountId() === this.mission.clientWallet) || (near.predecessorAccountId() === this.mission.talentWallet), 'Only either client or talent can cancel mission')
    assert(this.mission.status !== MissionStatus.Completed, "Mission must not be completed")
    
    this.mission.status = MissionStatus.Cancelled;
    this.mission.cancelledOn = near.blockTimestamp();
    near.log(`The contract status is set to cancelled`)

    near.log(`The account balance is reimbursed to the client`)
  }

  @call({})
  completeMission() {

    // assert(near.signerAccountId() === this.admin, 'Only admin can call this method')
    assert(near.predecessorAccountId() === this.mission.talentWallet, 'Only talent can confirm the he/she completed the mission')
    assert(this.mission.status === MissionStatus.Active, "Mission must be active to set it to completed")

    this.mission.status = MissionStatus.Completed;
    this.mission.completedOn = near.blockTimestamp();
    near.log(`Mission set to completed`)

  }

  @call({})
  payMission() {

    // assert(near.signerAccountId() === this.admin, 'Only admin can call this method')
    assert(near.predecessorAccountId() === this.mission.clientWallet, 'Only client can order payment')
    assert(this.mission.status === MissionStatus.Completed, "Mission has to be completed to process the payment")
    assert(near.accountBalance() >= this.mission.clientDeposit, "Not enough balance to pay")

    near.log(`NEAR token to transfer to talent: ${this.mission.tokenToPayTalent}`)
    this._transferToken({
      receivingAccountId: this.mission.talentWallet,
      amount: BigInt(this.mission.tokenToPayTalent) * YOCTO
    })
    near.log(`Talent paid`)

    near.log(`NEAR token commission to transfer to admin: ${this.mission.tokenToPayAdmin}`)
    this._transferToken({
      receivingAccountId: this.admin,
      amount: BigInt(this.mission.tokenToPayAdmin) * YOCTO
    })
    near.log(`Admin commission paid`)

    this.mission.status = MissionStatus.Paid;
  }

  @call({})
  deleteContract() {
    assert(near.predecessorAccountId() === this.admin, 'Only admin can delete this contract')
    assert(this.mission.status === MissionStatus.Paid || this.mission.status === MissionStatus.Cancelled, "Mission contract state is not valid")
    const promise = near.promiseBatchCreate(near.currentAccountId());
    near.promiseBatchActionDeleteAccount(
      promise,
      this.admin
    )
    return near.promiseReturn(promise)
  }

  @view({})
  getMission(): IMission {
    near.log('`Get mission data')
    return this.mission;
  }

  @view({})
  getAdmin(): string {
    near.log('`Get admin')
    return this.admin;
  }

  _transferToken({ receivingAccountId, amount }: {
    receivingAccountId: string;
    amount: bigint
  }) {

    const promise = near.promiseBatchCreate(receivingAccountId);
    near.promiseBatchActionTransfer(
      promise,
      amount
    )

    this.mission.status = MissionStatus.Paid;

    return near.promiseReturn(promise)
  }

}