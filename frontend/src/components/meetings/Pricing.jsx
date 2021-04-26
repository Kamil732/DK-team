import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import EditBox from '../../layout/forms/EditBox'

class Pricing extends Component {
	static propTypes = {
		hair_price: PropTypes.string.isRequired,
		beard_price: PropTypes.string.isRequired,
	}

	render() {
		const { hair_price, beard_price } = this.props

		return (
			<table className="table">
				<tbody>
					<tr>
						<th>Włosy</th>
						<td>
							<EditBox name="hair_price" value={hair_price}>
								{hair_price} zł
							</EditBox>
						</td>
					</tr>
					<tr>
						<th>Broda</th>
						<td>
							<EditBox name="beard_price" value={beard_price}>
								{beard_price} zł
							</EditBox>
						</td>
					</tr>
				</tbody>
			</table>
		)
	}
}

const mapStateToProps = (state) => ({
	hair_price: state.data.data.hair_price,
	beard_price: state.data.data.beard_price,
})

export default connect(mapStateToProps, null)(Pricing)
