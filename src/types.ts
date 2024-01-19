import Decimal from 'decimal.js'

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

export type EarlyRepayment = {
	paymentDate: Date
	type: PaymentType
	amount: Decimal.Value
}

export type ScheduleConfig = {
	amount: Decimal.Value
	issueDate: Date
	term: number
	rate: Decimal.Value
	paymentOnDay: number
	paymentAmount?: Decimal.Value
	earlyRepayment?: EarlyRepayment[]
}

export type Payment = {
	paymentDate: Date
	initialBalance?: Decimal.Value
	interestRate?: Decimal.Value
	interestAmount: Decimal.Value
	principalAmount?: Decimal.Value
	paymentAmount: Decimal.Value
	finalBalance: Decimal.Value
}

export type Schedule<P extends Payment = Payment> = {
	amount: number
	efficientRate: number
	fullAmount: number
	maxPaymentAmount: number
	minPaymentAmount: number
	overAllInterest: number
	payments: Array<P>
	term: number
}

export type InterestParameters = {
	from: Date
	to: Date
	amount: Decimal.Value
	rate: Decimal.Value
}
