# Library for loan amortization schedule manipulation

[![codecov](https://codecov.io/gh/lordzardeck/loan-schedule/branch/master/graph/badge.svg)](https://codecov.io/gh/lordzardeck/loan-schedule)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/c7e72328deea4876b950a4c7229297be)](https://app.codacy.com/gh/LordZardeck/loan-schedule/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![version](https://img.shields.io/npm/v/loan-schedule.svg)](https://www.npmjs.com/package/loan-schedule)
[![license](https://img.shields.io/npm/l/loan-schedule.svg)](https://www.npmjs.com/package/loan-schedule)

[..::Live demo::..](https://timmson.github.io/loan-schedule-ui/)

## Install
### Bun
```sh
bun add loan-schedule
```
### Yarn
```sh
yarn add loan-schedule
```
### NPM
```sh
npm i loan-schedule
```

## Annuity
```js
import { calculateAnnuityLoanSchedule } from 'loan-schedule'

const schedule = calculateAnnuityLoanSchedule(
	{
		amount: 500000,
		rate: 11.5,
		term: 12,
		paymentOnDay: 25,
		issueDate: new Date(2018, 9, 25),
	},
	{ decimalDigit: 2 },
)
```

### Provide payments manually
```js
import { calculateSchedule, generateAnnuityPayments } from 'loan-schedule'

const config = {
	amount: 500000,
	rate: 11.5,
	term: 12,
	paymentOnDay: 25,
	issueDate: new Date(2018, 9, 25),
}
const payments = generateAnnuityPayments(config)
const schedule = calculateSchedule(config, payments)
```

### Annuity loan schedule (payment amount will be calculated)
```js
import { calculateAnnuityLoanSchedule } from 'loan-schedule'

calculateAnnuityLoanSchedule({
	amount: 50000,
	rate: 11.5,
	term: 12,
	paymentOnDay: 25,
	issueDate: new Date(2016, 9, 24),
}).payments.forEach((pay) => {
	console.log(
		pay.paymentDate +
		'\t|\t\t' +
		pay.initialBalance +
		'\t|\t\t' +
		pay.paymentAmount +
		'\t|\t\t' +
		pay.principalAmount +
		'\t|\t\t' +
		pay.interestAmount +
		'\t|\t\t' +
		pay.finalBalance,
	)
})
```

### Annuity loan schedule (payment amount is set)
```js
import { calculateAnnuityLoanSchedule } from 'loan-schedule'

calculateAnnuityLoanSchedule({
	amount: 50000,
	rate: 11.5,
	term: 12,
	paymentAmount: 40000, // Configure your custom payment here
	paymentOnDay: 25,
	issueDate: new Date(2016, 9, 24),
}).payments.forEach((pay) => {
	console.log(
		pay.paymentDate +
		'\t|\t\t' +
		pay.initialBalance +
		'\t|\t\t' +
		pay.paymentAmount +
		'\t|\t\t' +
		pay.principalAmount +
		'\t|\t\t' +
		pay.interestAmount +
		'\t|\t\t' +
		pay.finalBalance,
	)
})
```

### Payment
```js
import { calculateAnnuityPaymentAmount } from 'loan-schedule'

const payment = calculateAnnuityPaymentAmount({
	amount: 110000,
	term: 60,
	rate: 12.9,
})
```

## Other Schedule Types

### Bubble Loan
```js
import { calculateBubbleLoanSchedule } from 'loan-schedule'

const schedule = calculateBubbleLoanSchedule({
	amount: 50000,
	rate: 11.5,
	term: 12,
	paymentOnDay: 25,
	issueDate: new Date(2016, 9, 25),
})
```

### Differentiated Loan
```js
import { calculateDifferentiatedLoanSchedule } from 'loan-schedule'

const schedule = calculateDifferentiatedLoanSchedule({
	amount: 50000,
	rate: 11.5,
	term: 12,
	paymentOnDay: 25,
	issueDate: new Date(2016, 9, 25),
})
```

## General Utilities

### Interest By Period
```js
import { calculateInterestByPeriod } from 'loan-schedule'

const interest = calculateInterestByPeriod({
	from: new Date(2015, 11, 10),
	to: new Date(2016, 0, 10),
	amount: 1000,
	rate: 16.7,
})
```

### Max Loan Amount
```js
import { calculateMaxLoanAmount } from 'loan-schedule'

const loanAmount = calculateMaxLoanAmount({
	paymentAmount: 2497.21,
	term: 60,
	rate: 12.9,
})
```