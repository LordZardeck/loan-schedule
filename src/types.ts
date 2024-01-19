import Decimal from 'decimal.js'

export type LSOptions = {
	decimalDigit?: number
	prodCalendar?: string
}

export enum PaymentType {
	ER_TYPE_MATURITY,
	ER_TYPE_ANNUITY,
	ER_TYPE_REGULAR,
}

export type LSEarlyRepayment = {
	paymentDate: Date
	type: PaymentType
	amount: Decimal.Value
}

export type LSParameters = {
	amount: Decimal.Value
	issueDate: Date
	term: number
	rate: Decimal.Value
	paymentOnDay: number
	paymentAmount?: Decimal.Value
	earlyRepayment?: LSEarlyRepayment[]
}

export type LSPayment = {
	paymentDate: Date
	initialBalance?: Decimal.Value
	interestRate?: Decimal.Value
	interestAmount: Decimal.Value
	principalAmount?: Decimal.Value
	paymentAmount: Decimal.Value
	finalBalance: Decimal.Value
}

export type LSSchedule<Payment extends LSPayment = LSPayment> = {
	amount?: Decimal.Value
	efficientRate?: Decimal.Value
	fullAmount?: Decimal.Value
	maxPaymentAmount?: Decimal.Value
	minPaymentAmount?: Decimal.Value
	overAllInterest: Decimal.Value
	payments: Array<Payment>
	term?: number
}

export type LSInterestParameters = {
	from: Date
	to: Date
	amount: Decimal.Value
	rate: Decimal.Value
}

export type LSInterestByPeriodParameters = {
	from: Date
	to: Date
	amount: Decimal.Value
	rate: Decimal.Value
}
