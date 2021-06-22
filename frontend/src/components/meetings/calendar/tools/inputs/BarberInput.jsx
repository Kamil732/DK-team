import React, { useEffect } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { useId } from 'react-id-generator'

import { loadBarbers } from '../../../../../redux/actions/data'

import FormControl from '../../../../../layout/forms/FormControl'
import Dropdown from '../../../../../layout/buttons/dropdowns/Dropdown'

function BarberInput({
	value,
	extraOptions,
	options,
	barbers,
	loadBarbers,
	onChange,
	...props
}) {
	const [id] = useId(1, 'barber-')

	useEffect(() => {
		if (barbers.length === 0) loadBarbers()
	}, [barbers, loadBarbers])

	return (
		<FormControl>
			<FormControl.Label htmlFor={id} inputValue={value?.full_name}>
				Fryzjer
			</FormControl.Label>
			<Dropdown
				id={id}
				value={value}
				getOptionLabel={(option) => option.full_name}
				getOptionValue={(option) => option.id}
				onChange={onChange}
				options={
					extraOptions?.length > 0
						? [...extraOptions, ...barbers]
						: options?.length > 0
						? options
						: barbers
				}
				{...props}
			/>
		</FormControl>
	)
}

BarberInput.prototype.propTypes = {
	value: PropTypes.any.isRequired,
	barbers: PropTypes.array,
	extraChoices: PropTypes.array,
	choices: PropTypes.array,
	onChange: PropTypes.func.isRequired,
}

const mapStateToProps = (state) => ({
	barbers: state.data.barbers,
})

const mapDispatchToProps = {
	loadBarbers,
}

export default connect(mapStateToProps, mapDispatchToProps)(BarberInput)
