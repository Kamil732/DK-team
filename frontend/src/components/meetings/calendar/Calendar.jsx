import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import moment from 'moment'
import 'moment/locale/pl'
import getHeaders from '../../../helpers/getHeaders'
import { NotificationManager } from 'react-notifications'

import axios from 'axios'
import { ADD_MEETING, REMOVE_MEETING } from '../../../redux/actions/types'
import {
	loadMeetings,
	connectWebSocket,
	changeVisibleMeetings,
} from '../../../redux/actions/meetings'

import Card from '../../../layout/cards/Card'
import BrickLoader from '../../../layout/loaders/BrickLoader'
import Modal from '../../../layout/Modal'

import {
	Calendar as BigCalendar,
	momentLocalizer,
	Views,
} from 'react-big-calendar'
import Toolbar from './tools/Toolbar'
import TouchCellWrapper from './tools/TouchCellWrapper'
import WeekHeader from './tools/WeekHeader'

import AddMeetingAdminForm from './AddMeetingAdminForm'
import Legend from './Legend'
import AddMeetingForm from './AddMeetingForm'
import EditMeetingAdminForm from './EditMeetingAdminForm'
import getWorkHours from '../../../helpers/getWorkHours'
import MonthDateHeader from './tools/MonthDateHeader'

moment.locale('PL')
const localizer = momentLocalizer(moment)

class Calendar extends Component {
	static propTypes = {
		isAdminPanel: PropTypes.bool,
		isAuthenticated: PropTypes.bool,
		ws: PropTypes.object,
		loading: PropTypes.bool,
		meetings: PropTypes.array,
		loadedDates: PropTypes.array,
		visibleMeetings: PropTypes.array,
		changeVisibleMeetings: PropTypes.func.isRequired,
		loadMeetings: PropTypes.func.isRequired,
		connectWebSocket: PropTypes.func.isRequired,

		one_slot_max_meetings: PropTypes.number.isRequired,
		work_time: PropTypes.number,
		end_work_sunday: PropTypes.string,
		start_work_sunday: PropTypes.string,
		end_work_saturday: PropTypes.string,
		start_work_saturday: PropTypes.string,
		end_work_friday: PropTypes.string,
		start_work_friday: PropTypes.string,
		end_work_thursday: PropTypes.string,
		start_work_thursday: PropTypes.string,
		end_work_wednesday: PropTypes.string,
		start_work_wednesday: PropTypes.string,
		end_work_tuesday: PropTypes.string,
		start_work_tuesday: PropTypes.string,
		end_work_monday: PropTypes.string,
		start_work_monday: PropTypes.string,
	}

	constructor(props) {
		super(props)

		const calendarDates = this.getCalendarMinAndMaxTime()

		this.state = {
			ws: null,
			windowWidth: window.innerWidth,

			currentDate: new Date(),
			view: window.innerWidth >= 768 ? Views.WEEK : Views.DAY,
			startOfMonth: moment().startOf('month').startOf('week').toDate(),
			endOfMonth: moment().endOf('month').endOf('week').toDate(),
			startOfWeek: moment().startOf('week').toDate(),
			endOfWeek: moment().endOf('week').toDate(),

			freeSlots: {},
			minDate: calendarDates.minDate,
			maxDate: calendarDates.maxDate,
			selected: {},
		}

		this.updateWindowDimensions = this.updateWindowDimensions.bind(this)
		this.getCalendarMinAndMaxTime = this.getCalendarMinAndMaxTime.bind(this)
		this.onNavigate = this.onNavigate.bind(this)
		this.onView = this.onView.bind(this)
		this.getDrilldownView = this.getDrilldownView.bind(this)
		this.onDrillDown = this.onDrillDown.bind(this)
		this.onRangeChange = this.onRangeChange.bind(this)
		this.eventPropGetter = this.eventPropGetter.bind(this)
		this.getIsDisabledSlot = this.getIsDisabledSlot.bind(this)
		this.setCountOfFreeSlots = this.setCountOfFreeSlots.bind(this)
		this.slotPropGetter = this.slotPropGetter.bind(this)
		this.onSelecting = this.onSelecting.bind(this)
		this.onSelectEvent = this.onSelectEvent.bind(this)
		this.onSelectSlot = this.onSelectSlot.bind(this)
		this.openModal = this.openModal.bind(this)
		this.deleteMeeting = this.deleteMeeting.bind(this)
		this.addMeeting = this.addMeeting.bind(this)
	}

	updateWindowDimensions = () =>
		this.setState({ windowWidth: window.innerWidth })

	getIsDisabledSlot = (isAdminPanel, date) => {
		const { one_slot_max_meetings, visibleMeetings } = this.props
		const workingHours = getWorkHours(moment(date).format('dddd'))
		let isDisabled = workingHours.isNonWorkingHour

		// Check if on the slot can be added meeting for non admin
		let notWorkingHours = []
		let eventsOnSlot = []

		for (let i = 0; i < visibleMeetings.length; i++) {
			if (
				visibleMeetings[i].start <= date &&
				visibleMeetings[i].end > date
			) {
				if (visibleMeetings[i].do_not_work)
					notWorkingHours.push(visibleMeetings[i])
				else if (!isAdminPanel && !visibleMeetings[i].do_not_work)
					eventsOnSlot.push(visibleMeetings[i])
			}

			if (
				notWorkingHours.length > 0 ||
				eventsOnSlot.length >= one_slot_max_meetings
			) {
				isDisabled = true
				break
			}
		}

		if (!isDisabled) {
			const convertedDate = date.getHours() * 60 + date.getMinutes()
			isDisabled =
				convertedDate < workingHours.start ||
				convertedDate > workingHours.end - this.props.work_time
		}

		return isDisabled
	}

	getCalendarMinAndMaxTime = () => {
		const today = new Date()

		let workHours = [
			{
				end: this.props?.end_work_sunday || null,
				start: this.props?.start_work_sunday || null,
			},
			{
				end: this.props?.end_work_saturday || null,
				start: this.props?.start_work_saturday || null,
			},
			{
				end: this.props?.end_work_friday || null,
				start: this.props?.start_work_friday || null,
			},
			{
				end: this.props?.end_work_thursday || null,
				start: this.props?.start_work_thursday || null,
			},
			{
				end: this.props?.end_work_wednesday || null,
				start: this.props?.start_work_wednesday || null,
			},
			{
				end: this.props?.end_work_tuesday || null,
				start: this.props?.start_work_tuesday || null,
			},
			{
				end: this.props?.end_work_monday || null,
				start: this.props?.start_work_monday || null,
			},
		].filter((workHour) => workHour.start !== null && workHour.end !== null)

		if (workHours.length === 0)
			workHours = [
				{
					start: '8:00',
					end: '17:00',
				},
			]

		workHours = workHours.map((workHour) => ({
			start: moment(
				new Date(
					today.getFullYear(),
					today.getMonth(),
					today.getDate(),
					workHour.start.split(':')[0],
					workHour.start.split(':')[1]
				)
			),
			end: moment(
				new Date(
					today.getFullYear(),
					today.getMonth(),
					today.getDate(),
					workHour.end.split(':')[0],
					workHour.end.split(':')[1]
				)
			),
		}))

		const minDate = moment.min(workHours.map((workHour) => workHour.start))
		const maxDate = moment.max(workHours.map((workHour) => workHour.end))

		return {
			minDate: new Date(
				today.getFullYear(),
				today.getMonth(),
				today.getDate(),
				minDate.hours(),
				minDate.minutes() - this.props.work_time
			),

			maxDate: new Date(
				today.getFullYear(),
				today.getMonth(),
				today.getDate(),
				maxDate.hours(),
				maxDate.minutes()
			),
		}
	}

	getVisibleMeetings = () => {
		let visibleMeetings = []

		const start =
			this.state.view === Views.MONTH
				? this.state.startOfMonth
				: this.state.startOfWeek
		const end =
			this.state.view === Views.MONTH
				? this.state.endOfMonth
				: this.state.endOfWeek

		for (let i = 0; i < this.props.meetings.length; i++) {
			if (
				(this.props.meetings[i].start >= start &&
					this.props.meetings[i].end <= end) ||
				(this.props.meetings[i].start <= start &&
					this.props.meetings[i].end >= end) ||
				(this.props.meetings[i].start >= start &&
					end > this.props.meetings[i].start) ||
				(this.props.meetings[i].end <= end &&
					start < this.props.meetings[i].end)
			)
				visibleMeetings.push(this.props.meetings[i])
		}

		this.props.changeVisibleMeetings(visibleMeetings)
	}

	setCountOfFreeSlots = () => {
		const start =
			this.state.view === Views.MONTH
				? this.state.startOfMonth
				: this.state.startOfWeek
		const end =
			this.state.view === Views.MONTH
				? this.state.endOfMonth
				: this.state.endOfWeek

		// Get free slots count
		let freeSlots = {}
		let currentDate = start

		while (currentDate <= end) {
			const workHours = getWorkHours(
				moment(currentDate).format('dddd'),
				false
			)

			if (!workHours.isNonWorkingHour) {
				let currentTime = moment(workHours.start, 'H:mm').toDate()
				while (currentTime < moment(workHours.end, 'H:mm').toDate()) {
					const isDisabled = this.getIsDisabledSlot(
						false,
						moment(currentDate)
							.add(currentTime.getHours(), 'hours')
							.add(currentTime.getMinutes(), 'minutes')
							.toDate()
					)

					if (!isDisabled && !workHours.isNonWorkingHour) {
						const date = moment(currentDate).format('YYYY-MM-DD')
						freeSlots[date] =
							date in freeSlots ? freeSlots[date] + 1 : 1
					}

					currentTime = moment(currentTime)
						.add(this.props.work_time, 'minutes')
						.toDate()
				}
			}

			currentDate = moment(currentDate).add(1, 'day').toDate()
		}
		this.setState({ freeSlots })
	}

	openModal = (type, selected) => {
		this.setState({
			selected: {
				selected_type: type,
				...selected,
			},
		})
	}

	componentDidMount = () => {
		window.addEventListener('resize', this.updateWindowDimensions)

		if (!this.props.loading) {
			if (!this.props.ws) this.props.connectWebSocket()
			if (this.props.loadedDates.length === 0) this.props.loadMeetings()
		}
		this.getVisibleMeetings()
		this.setCountOfFreeSlots()
	}

	componentWillUnmount = () =>
		window.removeEventListener('resize', this.updateWindowDimensions)

	componentDidUpdate(prevProps, prevState) {
		if (
			this.props.end_work_sunday !== prevProps.end_work_sunday ||
			this.props.start_work_sunday !== prevProps.start_work_sunday ||
			this.props.end_work_saturday !== prevProps.end_work_saturday ||
			this.props.start_work_saturday !== prevProps.start_work_saturday ||
			this.props.end_work_friday !== prevProps.end_work_friday ||
			this.props.start_work_friday !== prevProps.start_work_friday ||
			this.props.end_work_thursday !== prevProps.end_work_thursday ||
			this.props.start_work_thursday !== prevProps.start_work_thursday ||
			this.props.end_work_wednesday !== prevProps.end_work_wednesday ||
			this.props.start_work_wednesday !==
				prevProps.start_work_wednesday ||
			this.props.end_work_tuesday !== prevProps.end_work_tuesday ||
			this.props.start_work_tuesday !== prevProps.start_work_tuesday ||
			this.props.end_work_monday !== prevProps.end_work_monday ||
			this.props.start_work_monday !== prevProps.start_work_monday
		) {
			const calednarDates = this.getCalendarMinAndMaxTime()

			this.setState({
				minDate: calednarDates.minDate,
				maxDate: calednarDates.maxDate,
			})
		}

		if (
			prevProps.meetings !== this.props.meetings ||
			prevState.startOfWeek !== this.state.startOfWeek ||
			prevState.endOfWeek !== this.state.endOfWeek ||
			prevState.startOfMonth !== this.state.startOfMonth ||
			prevState.endOfMonth !== this.state.endOfMonth
		)
			this.getVisibleMeetings()

		if (prevProps.visibleMeetings !== this.props.visibleMeetings)
			this.setCountOfFreeSlots()
	}

	deleteMeeting = async () => {
		const { selected } = this.state

		try {
			await axios.delete(
				`${process.env.REACT_APP_API_URL}/meetings/${selected.id}/`,
				getHeaders(true)
			)

			this.props.ws.send(
				JSON.stringify({
					event: REMOVE_MEETING,
					payload: selected.id,
				})
			)

			this.setState({ selected: {} })
		} catch (err) {
			NotificationManager.error('Nie udało się usunąć wizyty', 'błąd')
		}
	}

	addMeeting = async (data) => {
		const { start, end } = this.state.selected
		const {
			do_not_work,
			customer,
			customer_first_name,
			customer_last_name,
			customer_phone_number,
			customer_fax_number,
			barber,
			type,
		} = data

		try {
			const body = JSON.stringify({
				start,
				end,
				customer,
				customer_first_name,
				customer_last_name,
				customer_phone_number,
				customer_fax_number,
				barber,
				type: do_not_work ? 'do_not_work' : type,
			})

			const res = await axios.post(
				`${process.env.REACT_APP_API_URL}/meetings/`,
				body,
				getHeaders(true)
			)

			this.props.ws.send(
				JSON.stringify({
					event: ADD_MEETING,
					payload: {
						id: res.data.id,
						from: res.data.start,
						to: res.data.end,
					},
				})
			)
			this.setState({ selected: {} })
		} catch (err) {
			NotificationManager.error('Nie udało się zapisać wizyty', 'błąd')
		}
	}

	onNavigate = (date) =>
		this.setState({
			currentDate: date,
			startOfMonth: moment(date)
				.startOf('month')
				.startOf('week')
				.toDate(),
			endOfMonth: moment(date).endOf('month').endOf('week').toDate(),
			startOfWeek: moment(date).startOf('week').toDate(),
			endOfWeek: moment(date).endOf('week').toDate(),
		})

	onView = async (view) => {
		this.setState({ view })

		if (view === Views.MONTH)
			await this.onRangeChange([
				this.state.startOfMonth,
				this.state.endOfMonth,
			])

		this.getVisibleMeetings()
	}

	getDrilldownView = (targetDate, currentViewName, configuredViewNames) => {
		if (
			currentViewName === Views.MONTH &&
			configuredViewNames.includes('week')
		)
			return 'week'

		return null
	}

	onDrillDown = (date, drilldownView) => {
		this.onNavigate(date)
		this.onView(drilldownView)
	}

	onRangeChange = async (dates) => {
		const from =
			this.state.view === Views.MONTH
				? moment(dates.start).format('YYYY-MM-DD')
				: moment(dates[0]).startOf('week').format('YYYY-MM-DD')

		const to =
			this.state.view === Views.MONTH
				? moment(dates.end).format('YYYY-MM-DD')
				: moment(dates[dates.length - 1])
						.endOf('week')
						.format('YYYY-MM-DD')

		await this.props.loadMeetings(from, to)
	}

	slotPropGetter = (date) => {
		const { isAdminPanel } = this.props
		const isDisabled = this.getIsDisabledSlot(isAdminPanel, date)

		return {
			className: isDisabled ? 'disabled' : '',
			style: {
				minHeight: isAdminPanel ? '110px' : 'auto',
			},
		}
	}

	eventPropGetter = (event) => {
		return {
			className: `${event.do_not_work ? 'doNotWork' : ''} ${
				this.props.isAdminPanel ||
				(this.props.isAuthenticated &&
					event.customer_phone_number ===
						this.props.user_phone_number &&
					!event.do_not_work)
					? 'selectable'
					: ''
			}`,
		}
	}

	onSelecting = () => (this.props.isAdminPanel ? true : false)

	onSelectEvent = (event) => {
		if (
			this.props.isAdminPanel ||
			(this.props.isAuthenticated &&
				event.customer_phone_number === this.props.user_phone_number &&
				!event.do_not_work)
		)
			this.openModal('event', event)
	}

	onSelectSlot = (slot) => {
		const workingHours = getWorkHours(moment(slot.start).format('dddd'))
		const start = slot.start.getHours() * 60 + slot.start.getMinutes()

		let [eventsOnTheSlot, isNonWorkingHour] = [
			false,
			workingHours.isNonWorkingHour,
		]

		if (start !== 0) {
			if (
				// Check if slot is not between work hours
				start < workingHours.start ||
				start > workingHours.end - this.props.work_time ||
				// Check if there is any do_not_work type of meeting
				this.props.visibleMeetings.filter(
					(meeting) =>
						meeting.do_not_work &&
						((meeting.start >= slot.start &&
							meeting.end <= slot.end) ||
							(meeting.start <= slot.start &&
								meeting.end >= slot.end) ||
							(meeting.start >= slot.start &&
								slot.end > meeting.start) ||
							(meeting.end <= slot.end &&
								slot.start < meeting.end))
				).length > 0
			)
				isNonWorkingHour = true

			// Check if there are events on the slot
			if (!isNonWorkingHour)
				eventsOnTheSlot = this.props.visibleMeetings.filter(
					(meeting) =>
						meeting.start >= slot.start && meeting.end <= slot.end
				).length
		}

		if (this.props.isAdminPanel) {
			if (!isNonWorkingHour) this.openModal('slot', slot)
		} else {
			if (
				eventsOnTheSlot < this.props.one_slot_max_meetings &&
				!isNonWorkingHour &&
				start !== 0
			)
				this.openModal('slot', slot)
		}
	}

	render() {
		const {
			loading,
			isAdminPanel,
			user_phone_number,
			isAuthenticated,
			work_time,
			visibleMeetings,
		} = this.props
		const {
			windowWidth,
			view,
			currentDate,
			selected,
			minDate,
			maxDate,
			startOfMonth,
			endOfMonth,
			startOfWeek,
			endOfWeek,
		} = this.state

		let meetings = []

		// Filter meetings that should be displayed
		for (let i = 0; i < visibleMeetings.length; i++) {
			const start = view === Views.MONTH ? startOfMonth : startOfWeek
			const end = view === Views.MONTH ? endOfMonth : endOfWeek

			if (
				(visibleMeetings[i].start >= start &&
					visibleMeetings[i].end <= end) ||
				(visibleMeetings[i].start <= start &&
					visibleMeetings[i].end >= end) ||
				(visibleMeetings[i].start >= start &&
					end > visibleMeetings[i].start) ||
				(visibleMeetings[i].end <= end &&
					start < visibleMeetings[i].end)
			) {
				if (
					// MONTH and allDay meeting
					(view === Views.MONTH && visibleMeetings[i].allDay) ||
					// Not MONTH and IsAdminPanel
					(view !== Views.MONTH && isAdminPanel) ||
					// Not MONTH and is owner of meeting
					(view !== Views.MONTH &&
						(visibleMeetings[i].do_not_work ||
							(visibleMeetings[i].customer_phone_number ===
								user_phone_number &&
								isAuthenticated)))
				)
					meetings.push(visibleMeetings[i])
			}
		}

		return (
			<>
				{Object.keys(selected).length ? (
					<Modal closeModal={() => this.setState({ selected: {} })}>
						<Modal.Header>
							{selected.do_not_work ? (
								<>
									{moment(selected.start).format(
										'DD/MM/YYYY'
									)}{' '}
									-{' '}
									{moment(selected.end).format('DD/MM/YYYY')}
								</>
							) : (
								<>
									{moment(selected.start).format('DD/H:mm')} -{' '}
									{moment(selected.end).format('DD/H:mm')}
								</>
							)}
							<br />
							{selected?.full_title}
						</Modal.Header>
						<Modal.Body>
							{selected.selected_type === 'event' ? (
								<EditMeetingAdminForm
									deleteMeeting={this.deleteMeeting}
									selected={selected}
								/>
							) : isAdminPanel ? (
								<AddMeetingAdminForm
									addMeeting={this.addMeeting}
									doNotWork={
										selected.slots.length > 2 ||
										selected.start.getHours() * 60 +
											selected.start.getMinutes() ===
											0 ||
										visibleMeetings.filter(
											(meeting) =>
												meeting.start >=
													selected.start &&
												meeting.end <= selected.end
										).length >=
											this.props.one_slot_max_meetings
									}
								/>
							) : (
								<AddMeetingForm />
							)}
						</Modal.Body>
					</Modal>
				) : null}

				<Card data-aos="zoom-out-up">
					<Card.Body>
						<Legend />
					</Card.Body>
					<Card.Body>
						<div style={{ display: loading ? 'none' : 'block' }}>
							<BigCalendar
								onNavigate={this.onNavigate}
								onView={this.onView}
								onRangeChange={this.onRangeChange}
								localizer={localizer}
								events={meetings}
								step={work_time}
								timeslots={1}
								views={[Views.MONTH, Views.WEEK, Views.DAY]}
								view={view}
								date={currentDate}
								min={minDate}
								max={maxDate}
								dayLayoutAlgorithm="no-overlap"
								slotPropGetter={this.slotPropGetter}
								eventPropGetter={this.eventPropGetter}
								dayPropGetter={this.dayPropGetter}
								selectable={true}
								selected={selected}
								onSelecting={this.onSelecting}
								onSelectSlot={this.onSelectSlot}
								onSelectEvent={this.onSelectEvent}
								getDrilldownView={this.getDrilldownView}
								onDrillDown={this.onDrillDown}
								components={{
									toolbar: (props) => (
										<Toolbar
											windowWidth={windowWidth}
											{...props}
										/>
									),
									timeSlotWrapper: (props) => (
										<TouchCellWrapper
											{...props}
											onSelectSlot={this.onSelectSlot}
										/>
									),
									week: {
										header: (props) => (
											<WeekHeader
												{...props}
												freeSlots={this.state.freeSlots}
											/>
										),
									},
									month: {
										dateHeader: (props) => (
											<MonthDateHeader
												{...props}
												freeSlots={this.state.freeSlots}
											/>
										),
									},
								}}
								messages={{
									month: 'Miesiąc',
									week: 'Tydzień',
									day: 'Dzień',
									date: 'Data',
									event: 'Spotkanie',
								}}
							/>
						</div>
						{loading && <BrickLoader />}
					</Card.Body>
				</Card>
			</>
		)
	}
}

const mapStateToProps = (state) => ({
	isAuthenticated: state.auth.isAuthenticated,
	user_phone_number: state.auth.data.phone_number,
	ws: state.meetings.ws,
	loading: state.meetings.loading,
	meetings: state.meetings.data,
	loadedDates: state.meetings.loadedDates,
	visibleMeetings: state.meetings.visibleData,

	one_slot_max_meetings: state.data.data.one_slot_max_meetings,
	work_time: parseInt(state.data.data[process.env.REACT_APP_WORK_TIME]) || 30,
	end_work_sunday:
		state.data.data[process.env.REACT_APP_END_WORK_SUNDAY] || '',
	start_work_sunday:
		state.data.data[process.env.REACT_APP_START_WORK_SUNDAY] || '',
	end_work_saturday:
		state.data.data[process.env.REACT_APP_END_WORK_SATURDAY] || '',
	start_work_saturday:
		state.data.data[process.env.REACT_APP_START_WORK_SATURDAY] || '',
	end_work_friday:
		state.data.data[process.env.REACT_APP_END_WORK_FRIDAY] || '',
	start_work_friday:
		state.data.data[process.env.REACT_APP_START_WORK_FRIDAY] || '',
	end_work_thursday:
		state.data.data[process.env.REACT_APP_END_WORK_THURSDAY] || '',
	start_work_thursday:
		state.data.data[process.env.REACT_APP_START_WORK_THURSDAY] || '',
	end_work_wednesday:
		state.data.data[process.env.REACT_APP_END_WORK_WEDNESDAY] || '',
	start_work_wednesday:
		state.data.data[process.env.REACT_APP_START_WORK_WEDNESDAY] || '',
	end_work_tuesday:
		state.data.data[process.env.REACT_APP_END_WORK_TUESDAY] || '',
	start_work_tuesday:
		state.data.data[process.env.REACT_APP_START_WORK_TUESDAY] || '',
	end_work_monday:
		state.data.data[process.env.REACT_APP_END_WORK_MONDAY] || '',
	start_work_monday:
		state.data.data[process.env.REACT_APP_START_WORK_MONDAY] || '',
})

const mapDispatchToProps = {
	loadMeetings,
	connectWebSocket,
	changeVisibleMeetings,
}

export default connect(mapStateToProps, mapDispatchToProps)(Calendar)
