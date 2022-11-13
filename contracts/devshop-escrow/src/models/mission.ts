import { near, assert } from 'near-sdk-js';

export enum MissionStatus {
    WaitingTalentAcceptance = 0,
    Accepted=1,
    Rejected=2,
    Active=3,
    Cancelled=4,
    Completed=5,
    Paid=6,
    UnderDispute=7,
    DisputeResolved=8
}

export class Mission {
    status: MissionStatus;
    amountToPayTalent: bigint;
    amountToPayAdmin: bigint;
    createdOn: bigint;
    acceptedOn: bigint;
    activeSince: bigint;
    cancelledOn: bigint;
    completedOn: bigint;
    paidOn: bigint;
  
    constructor(
        public clientWallet: string,
        public talentWallet: string,
        public missionContentHash: string,
        public clientDeposit: bigint,
        public dueDate: string,
        public percentageAdmin: bigint
    ) {
        assert(percentageAdmin < 100, "Percentage should be between 0 and 100")
        this.createdOn = near.blockTimestamp();
        this.status = MissionStatus.WaitingTalentAcceptance;
        
        const rate = percentageAdmin/(100 as unknown as bigint);
        this.amountToPayAdmin =  rate * this.clientDeposit;
        this.amountToPayTalent = (1 as unknown as bigint - rate) * this.clientDeposit;
    }

    changeStatus = (newStatus: MissionStatus) => {
        this.status = newStatus;
        switch (newStatus) {
            case MissionStatus.Accepted:
                this.acceptedOn = near.blockTimestamp();
                break;
            case MissionStatus.Active:
                    this.activeSince = near.blockTimestamp();
                    break;
            case MissionStatus.Cancelled:
                this.cancelledOn = near.blockTimestamp();
                break;
            case MissionStatus.Completed:
                this.completedOn = near.blockTimestamp();
                break;
            case MissionStatus.Paid:
                this.paidOn = near.blockTimestamp();
                 break;
            default:
                break;
        }
    }

  }