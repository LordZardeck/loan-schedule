import type Decimal from 'decimal.js'

export type ScheduleOptions = {
	decimalDigit?: number
	isHoliday?: (date: Date) => boolean
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
	paymentAmount: Decimal.Value
}

export type ScheduleConfig = {
	amount: Decimal.Value
	issueDate: Date
	termLength: number
	rate: Decimal.Value
	paymentOnDay: number
	paymentAmount?: Decimal.Value
	earlyRepayments?: SchedulePoint[]
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
	termLength: number
}

export type InterestParameters = {
	from: Date
	to: Date
	amount: Decimal.Value
	rate: Decimal.Value
}
