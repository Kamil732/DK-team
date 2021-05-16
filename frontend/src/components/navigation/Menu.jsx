import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { IoMdMegaphone, IoMdNotifications } from 'react-icons/io'

import { logout } from '../../redux/actions/auth'
import { NavLink } from 'react-router-dom'
import Button from '../../layout/buttons/Button'
import Dropdown from '../../layout/buttons/Dropdown'
import { getNotifications } from '../../redux/actions/data'

class Menu extends Component {
	static propTypes = {
		isAuthenticated: PropTypes.bool,
		loading: PropTypes.bool,
		isAdmin: PropTypes.bool,
		notificationLoading: PropTypes.bool,
		notifications: PropTypes.array,
		logout: PropTypes.func.isRequired,
		closeNavigation: PropTypes.func.isRequired,
		getNotifications: PropTypes.func.isRequired,
	}

	render() {
		const {
			loading,
			isAuthenticated,
			isAdmin,
			notificationLoading,
			notifications,
			logout,
			closeNavigation,
			getNotifications,
		} = this.props

		return (
			<>
				<NavLink
					exact
					to="/"
					className="nav__link"
					onClick={closeNavigation}
				>
					Home
				</NavLink>
				<NavLink
					to="/contact"
					className="nav__link"
					onClick={closeNavigation}
				>
					Kontakt
				</NavLink>
				<NavLink
					to="/gallery"
					className="nav__link"
					onClick={closeNavigation}
				>
					Galeria
				</NavLink>
				{!loading ? (
					!isAuthenticated ? (
						<>
							<NavLink
								to="/login"
								className="nav__link"
								onClick={closeNavigation}
							>
								Zaloguj się
							</NavLink>
						</>
					) : (
						<>
							{isAdmin ? (
								<>
									<NavLink
										to="/meetings/calendar"
										className="nav__link"
										onClick={closeNavigation}
									>
										Panel
									</NavLink>
									<a
										href="/admin/"
										className="nav__link"
										onClick={closeNavigation}
									>
										Admin
									</a>
								</>
							) : (
								<>
									<NavLink
										to="/meetings/calendar"
										className="nav__link"
										onClick={closeNavigation}
									>
										Moje wizyty
									</NavLink>
								</>
							)}
							{window.innerWidth > 768 && (
								<Dropdown
									btnContent={<IoMdNotifications size={25} />}
									rounded
									loading={notificationLoading}
									loadItems={getNotifications}
									items={notifications}
									noItemsContent={
										<div
											style={{
												display: 'flex',
												flexDirection: 'column',
												justifyContent: 'center',
												alignItems: 'center',
												height: '100%',
											}}
										>
											<IoMdMegaphone fontSize="100" />

											<h3 style={{ textAlign: 'center' }}>
												Nie masz żadnych powiadomień
											</h3>
										</div>
									}
								/>
							)}
							<Button
								onClick={() => {
									closeNavigation()
									logout()
								}}
								rounded
							>
								Wyloguj się
							</Button>
						</>
					)
				) : null}
			</>
		)
	}
}

const mapStateToProps = (state) => ({
	isAuthenticated: state.auth.isAuthenticated,
	loading: state.auth.loading,
	isAdmin: state.auth.data.is_admin,
	notificationLoading: state.data.notifications.loading,
	notifications: state.data.notifications.data,
})

const mapDispatchToProps = {
	logout,
	getNotifications,
}

export default connect(mapStateToProps, mapDispatchToProps)(Menu)
