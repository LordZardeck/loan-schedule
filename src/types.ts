import type { BigSource } from 'big.js'

export type ScheduleOptions = {
	decimalDigit?: number
	prodCalendar?: string
}

// TODO: Document what each payment type actually does
export enum PaymentType {
	ER_TYPE_MATURITY,
	ER_TYPE_ANNUITY,
	ER_TYPE_REGULAR,
}

export type SchedulePoint = {
	paymentDate: Date
	paymentType: PaymentType
	paymentAmount: BigSource
}

export type ScheduleConfig = {
	amount: BigSource
	issueDate: Date
	termLength: number
	rate: BigSource
	paymentOnDay: number
	paymentAmount?: BigSource
	earlyRepayments?: SchedulePoint[]
}

export type Payment = {
	paymentDate: Date
	initialBalance?: BigSource
	interestRate?: BigSource
	interestAmount: BigSource
	principalAmount?: BigSource
	paymentAmount: BigSource
	finalBalance: BigSource
}

export type Schedule<P extends Payment = Payment> = {
	amount: number
	efficientRate: number
	fullAmount: number
	maxPaymentAmount: number
	minPaymentAmount: number
	overAllInterest: number
	payments: Array<P>
	termLength: number
}

export type InterestParameters = {
	from: Date
	to: Date
	amount: BigSource
	rate: BigSource
}
