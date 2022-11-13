// Find all our documentation at https://docs.near.org
import { NearBindgen, near, call, view, initialize, assert } from 'near-sdk-js';
import { Mission, MissionStatus } from './models/mission';
@NearBindgen({ requireInit: true })
class DevshopEscrow {
  
  admin: string = "";
  mission: Mission = null;
  minDeposit: bigint = 0 as unknown as bigint;
  percentageAdmin: bigint = 0 as unknown as bigint;

  @initialize({})
  init({
    percentageAdmin,
    minDeposit
  }) {
    assert(!this.admin, "Contract already initialized")
    assert(percentageAdmin < 100, "Percentage should be between 0 and 100")
    this.admin = near.signerAccountId();
    this.percentageAdmin = percentageAdmin;
    this.minDeposit = minDeposit;
  }

  @call({})
  createMission(missionData: {
    clientWallet: string,
    talentWallet: string,
    missionContentHash: string,
    dueDate: string
  }) {
    assert(near.signerAccountId() === this.admin, 'Only admin can sign this call')
    assert(near.predecessorAccountId() === missionData.clientWallet, 'Only client can request to create a mission')
    assert(near.attachedDeposit() > this.minDeposit, 'The attached deposit is below the minimum amount required to initialise mission')
    
    this.mission = new Mission(
      missionData.clientWallet,
      missionData.talentWallet,
      missionData.missionContentHash,
      near.attachedDeposit(),
      missionData.dueDate,
      this.percentageAdmin);

    near.log(`Mission created, waiting the talent to accept`)
   }


   @call({})
   startMission() {
      assert(near.signerAccountId() === this.admin, 'Only admin can sign this call')
      assert(near.predecessorAccountId() === this.mission.clientWallet, 'Only client can order payment')
      assert(this.mission.status === MissionStatus.Accepted, "Mission must be accepted by talent to start")

      near.log(`Make the contract active`)
      this.mission.changeStatus(MissionStatus.Active);
   }


   @call({})
   cancelMission() {
      assert(near.signerAccountId() === this.admin, 'Only admin can sign this call')
      assert((near.predecessorAccountId() === this.mission.clientWallet) || (near.predecessorAccountId() === this.mission.talentWallet), 'Either client or talent can cancel mission')

      near.log(`Processing cancellation`)
      this.mission.changeStatus(MissionStatus.Cancelled);

      // Payback Client
      this._sendNEAR({
        receivingAccountId: this.mission.clientWallet,
        amount: near.accountBalance()
      })
   }

   @call({}) 
   setCompleted(){
    assert(near.signerAccountId() === this.admin, 'Only admin can sign this call')
    assert(near.predecessorAccountId() === this.mission.talentWallet, 'Only talent can confirm the he/she completed the mission')
    assert(this.mission.status === MissionStatus.Active, "Mission must be active to set it to completed")
    
    this.mission.changeStatus(MissionStatus.Completed);
    near.log(`Mission set to completed`)

   }

   @call({})
   payMission() {
      assert(near.signerAccountId() === this.admin, 'Only admin can sign this call')
      assert(near.predecessorAccountId() === this.mission.clientWallet, 'Only client can order payment')
      assert(this.mission.status === MissionStatus.Completed, "Mission has to be completed to process the payment")
      assert(near.accountBalance() >= this.mission.clientDeposit, "Not enough balance to pay")

      near.log(`Processing mission payment`)

      // Pay Talent
      this._sendNEAR({
        receivingAccountId: this.mission.talentWallet,
        amount: this.mission.amountToPayTalent
      })

      // Pay Admin
      this._sendNEAR({
        receivingAccountId: this.admin,
        amount: this.mission.amountToPayAdmin
      })

      this.mission.changeStatus(MissionStatus.Paid);

      // Payback Client
      this._sendNEAR({
        receivingAccountId: this.mission.clientWallet,
        amount: near.accountBalance()
      })
   }

   @view({})
   viewMission(): Mission {
    return this.mission;
   }

   _sendNEAR({receivingAccountId, amount}) {
      const promise = near.promiseBatchCreate(receivingAccountId);
      near.promiseBatchActionTransfer(promise, amount);
      near.log(`${amount} transferred to ${receivingAccountId}`)
      return near.promiseReturn(promise);
   }
}