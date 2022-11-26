import { near, assert } from 'near-sdk-js';


export interface IMission {
    clientWallet: string,
    talentWallet: string,
    missionContentHash: string,
    dueDate: string,
    percentageAdmin: number
}

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
    public status: MissionStatus;
    tokenToPayTalent: number;
    tokenToPayAdmin: number;
    createdOn: bigint;
    public acceptedOn: bigint;
    public activeSince: bigint;
    public cancelledOn: bigint;
    public completedOn: bigint;
    public paidOn: bigint;

    constructor(
        public clientWallet: string,
        public talentWallet: string,
        public missionContentHash: string,
        public clientDeposit: number,
        public dueDate: string,
        public percentageAdmin: number
    ) {
        assert(percentageAdmin >= 0 as unknown as bigint, "Percentage should be between 0 and 100")
        assert(percentageAdmin <= 100 as unknown as bigint, "Percentage should be between 0 and 100")
    
        this.createdOn = near.blockTimestamp();
        this.status = MissionStatus.WaitingTalentAcceptance;
        
        near.log(`percentageAdmin: ${ percentageAdmin }`)
        near.log(`clientDeposit: ${ clientDeposit }`)

        this.tokenToPayAdmin =  percentageAdmin/100 *  clientDeposit;
        this.tokenToPayTalent = clientDeposit - this.tokenToPayAdmin;

        near.log(`tokenToPayAdmin: ${ this.tokenToPayAdmin }`)
        near.log(`tokenToPayTalent: ${ this.tokenToPayTalent }`)
    }

  }