import Decimal from 'decimal.js'
import { AbstractLoanSchedule } from './AbstractLoanSchedule'
import { LSOptions, LSParameters, LSPayment, LSSchedule } from './types'
import { addMonths, setDate } from 'date-fns'

export class BubbleLoanSchedule extends AbstractLoanSchedule {
	calculateSchedule(parameters: LSParameters): LSSchedule {
		const { issueDate, term, amount, rate, paymentOnDay } = parameters

		const payments = Array.from<LSPayment>({ length: term }).reduce(
			(payments) => {
				const previousPayment = payments.at(-1)

				if (!previousPayment) throw new Error('Unexpected error in retrieving previous payment')

				const paymentDate = setDate(addMonths(previousPayment.paymentDate, 1), paymentOnDay)
				const initialBalance = previousPayment.finalBalance
				const principalAmount = payments.length === term ? initialBalance : new Decimal(0).toFixed(this.decimal)
				const interestAmount = new Decimal(
					this.calculateInterestByPeriod({
						from: previousPayment.paymentDate,
						to: paymentDate,
						amount: initialBalance,
						rate: new Decimal(rate).toFixed(2),
					}),
				).toFixed(this.decimal)

				return [
					...payments,
					{
						paymentDate,
						initialBalance,
						interestRate: rate,
						principalAmount,
						interestAmount,
						paymentAmount: new Decimal(principalAmount)
							.plus(new Decimal(interestAmount))
							.toFixed(this.decimal),
						finalBalance: new Decimal(initialBalance)
							.minus(new Decimal(principalAmount))
							.toFixed(this.decimal),
					},
				]
			},
			[this.getInitialPayment(amount, issueDate, rate)] as LSPayment[],
		)

		return this.applyFinalCalculation(parameters, payments)
	}
}

export function calculateBubbleLoanSchedule(parameters: LSParameters, options?: LSOptions) {
	return new BubbleLoanSchedule(options).calculateSchedule(parameters)
}
