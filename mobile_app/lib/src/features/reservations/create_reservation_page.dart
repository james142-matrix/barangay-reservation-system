import 'package:flutter/material.dart';

import '../../core/ui_error.dart';
import '../auth/auth_user.dart';
import '../facilities/facility.dart';
import 'reservation.dart';

typedef CreateReservationFn =
    Future<void> Function(Map<String, Object?> payload);

class CreateReservationPage extends StatefulWidget {
  const CreateReservationPage({
    super.key,
    required this.user,
    required this.facilities,
    required this.existingReservations,
    required this.onCreateReservation,
  });

  final AuthUser user;
  final List<Facility> facilities;
  final List<Reservation> existingReservations;
  final CreateReservationFn onCreateReservation;

  @override
  State<CreateReservationPage> createState() => _CreateReservationPageState();
}

class _CreateReservationPageState extends State<CreateReservationPage> {
  final _formKey = GlobalKey<FormState>();
  final _clientNameController = TextEditingController();
  final _clientNameFocus = FocusNode();
  final _clientAddressController = TextEditingController();
  final _clientAddressFocus = FocusNode();
  final _organizationController = TextEditingController();
  final _clientEmailController = TextEditingController();
  final _clientEmailFocus = FocusNode();
  final _contactPhoneController = TextEditingController();
  final _contactPhoneFocus = FocusNode();
  final _purposeController = TextEditingController();
  final _purposeFocus = FocusNode();
  final _additionalNotesController = TextEditingController();
  final _expectedGuestsController = TextEditingController(text: '1');
  final _expectedGuestsFocus = FocusNode();
  final _downPaymentController = TextEditingController(text: '0');
  final _downPaymentFocus = FocusNode();
  final _medicalRoomDetailsController = TextEditingController();
  final _medicalRoomDetailsFocus = FocusNode();

  Facility? _selectedFacility;
  String _selectedEventType = '';
  DateTime? _eventDate;
  DateTime? _eventEndDate;
  TimeOfDay? _startTime;
  TimeOfDay? _endTime;
  String _paymentOption = 'full';
  bool _submitting = false;
  bool _showValidation = false;
  final Map<String, int> _selectedAddOnQty = <String, int>{};

  List<Facility> get _availableFacilities => widget.facilities
      .where((f) => f.status.toLowerCase() == 'available')
      .toList(growable: false);

  @override
  void initState() {
    super.initState();
    _clientNameController.text = widget.user.fullname.isNotEmpty
        ? widget.user.fullname
        : widget.user.username;
    _clientEmailController.text = widget.user.email;
    if (_availableFacilities.isNotEmpty) {
      _selectedFacility = _availableFacilities.first;
      _syncEventType();
      _syncAddOns();
    }
  }

  @override
  void dispose() {
    _clientNameController.dispose();
    _clientNameFocus.dispose();
    _clientAddressController.dispose();
    _clientAddressFocus.dispose();
    _organizationController.dispose();
    _clientEmailController.dispose();
    _clientEmailFocus.dispose();
    _contactPhoneController.dispose();
    _contactPhoneFocus.dispose();
    _purposeController.dispose();
    _purposeFocus.dispose();
    _additionalNotesController.dispose();
    _expectedGuestsController.dispose();
    _expectedGuestsFocus.dispose();
    _downPaymentController.dispose();
    _downPaymentFocus.dispose();
    _medicalRoomDetailsController.dispose();
    _medicalRoomDetailsFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final facilities = _availableFacilities;
    if (_selectedFacility != null &&
        facilities.every((f) => f.id != _selectedFacility!.id)) {
      _selectedFacility = facilities.isNotEmpty ? facilities.first : null;
      _syncEventType();
      _syncAddOns();
    }
    if (facilities.isEmpty) {
      return const Center(
        child: Text('No facilities are currently available for reservation.'),
      );
    }

    final totalCost = _estimatedTotal();
    final durationHours = _estimatedDurationHours();
    final amountToPay = _paymentOption == 'down_payment'
        ? ((double.tryParse(_downPaymentController.text.trim()) ?? 0).clamp(
            0,
            totalCost,
          )).toDouble()
        : totalCost;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'Create New Reservation',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              autovalidateMode: _showValidation
                  ? AutovalidateMode.always
                  : AutovalidateMode.disabled,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Applicant Information',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _clientNameController,
                    focusNode: _clientNameFocus,
                    decoration: const InputDecoration(
                      labelText: 'Client Name *',
                      border: OutlineInputBorder(),
                    ),
                    validator: _validateClientName,
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _clientAddressController,
                    focusNode: _clientAddressFocus,
                    minLines: 2,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Client Address *',
                      border: OutlineInputBorder(),
                    ),
                    validator: _validateClientAddress,
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _organizationController,
                    decoration: const InputDecoration(
                      labelText: 'Organization (Optional)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _contactPhoneController,
                          focusNode: _contactPhoneFocus,
                          keyboardType: TextInputType.phone,
                          decoration: const InputDecoration(
                            labelText: 'Contact Number *',
                            border: OutlineInputBorder(),
                          ),
                          validator: _validateContactPhone,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextFormField(
                          controller: _clientEmailController,
                          focusNode: _clientEmailFocus,
                          decoration: const InputDecoration(
                            labelText: 'Email Address *',
                            border: OutlineInputBorder(),
                          ),
                          validator: _validateClientEmail,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Reservation Details',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<Facility>(
                    key: ValueKey('facility_${_selectedFacility?.id ?? 0}'),
                    initialValue: _selectedFacility,
                    decoration: const InputDecoration(
                      labelText: 'Facility Requested *',
                      border: OutlineInputBorder(),
                    ),
                    items: facilities
                        .map(
                          (f) => DropdownMenuItem(
                            value: f,
                            child: Text(
                              '${f.name} (PHP ${f.price.toStringAsFixed(2)})',
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: _submitting
                        ? null
                        : (value) {
                            setState(() {
                              _selectedFacility = value;
                              if (_selectedFacility != null &&
                                  !_selectedFacility!.allowsMultiDay &&
                                  _eventDate != null) {
                                _eventEndDate = _eventDate;
                              }
                              _syncEventType();
                              _syncAddOns();
                            });
                          },
                  ),
                  const SizedBox(height: 8),
                  _buildFacilityRulesHint(),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    key: ValueKey(
                      'event_${_selectedFacility?.id ?? 0}_$_selectedEventType',
                    ),
                    initialValue: _selectedEventType.isEmpty
                        ? null
                        : _selectedEventType,
                    decoration: const InputDecoration(
                      labelText: 'Event Type *',
                      border: OutlineInputBorder(),
                    ),
                    items: _availableEventTypes()
                        .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                        .toList(),
                    onChanged: _submitting
                        ? null
                        : (value) {
                            setState(() => _selectedEventType = value ?? '');
                          },
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _purposeController,
                    focusNode: _purposeFocus,
                    decoration: const InputDecoration(
                      labelText: 'Purpose of Event *',
                      border: OutlineInputBorder(),
                    ),
                    validator: _validatePurpose,
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _submitting ? null : _pickStartDate,
                          icon: const Icon(Icons.calendar_today),
                          label: Text(
                            _eventDate == null
                                ? 'Start Date *'
                                : _fmtDate(_eventDate!),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed:
                              _submitting ||
                                  (_selectedFacility != null &&
                                      !_selectedFacility!.allowsMultiDay)
                              ? null
                              : _pickEndDate,
                          icon: const Icon(Icons.event),
                          label: Text(
                            _eventEndDate == null
                                ? 'End Date *'
                                : _fmtDate(_eventEndDate!),
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (_showValidation &&
                      (_eventDate == null || _eventEndDate == null))
                    const Padding(
                      padding: EdgeInsets.only(top: 6),
                      child: Text(
                        'Please select reservation start and end date.',
                        style: TextStyle(color: Colors.redAccent, fontSize: 12),
                      ),
                    ),
                  if (_selectedFacility != null &&
                      !_selectedFacility!.allowsMultiDay)
                    const Padding(
                      padding: EdgeInsets.only(top: 6),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'Multi-day reservation is not allowed for this facility.',
                          style: TextStyle(fontSize: 12, color: Colors.black54),
                        ),
                      ),
                    ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _expectedGuestsController,
                    focusNode: _expectedGuestsFocus,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Expected Number of Participants *',
                      border: OutlineInputBorder(),
                    ),
                    validator: _validateExpectedGuests,
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _submitting ? null : _pickStartTime,
                          icon: const Icon(Icons.schedule),
                          label: Text(
                            _startTime == null
                                ? 'Start Time *'
                                : _fmtTime(_startTime!),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _submitting ? null : _pickEndTime,
                          icon: const Icon(Icons.schedule_send),
                          label: Text(
                            _endTime == null
                                ? 'End Time *'
                                : _fmtTime(_endTime!),
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (_showValidation &&
                      (_startTime == null || _endTime == null))
                    const Padding(
                      padding: EdgeInsets.only(top: 6),
                      child: Text(
                        'Please select reservation start and end time.',
                        style: TextStyle(color: Colors.redAccent, fontSize: 12),
                      ),
                    ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _additionalNotesController,
                    minLines: 2,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      labelText: 'Additional Notes / Description',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 10),
                  _buildAddOnsSection(),
                  if ((_selectedFacility?.name.toLowerCase() ?? '') ==
                      'medical room') ...[
                    const SizedBox(height: 10),
                    TextFormField(
                      controller: _medicalRoomDetailsController,
                      focusNode: _medicalRoomDetailsFocus,
                      decoration: const InputDecoration(
                        labelText: 'Medical Room (Specific Room/Need) *',
                        border: OutlineInputBorder(),
                      ),
                      validator: _validateMedicalRoomDetails,
                    ),
                  ],
                  const SizedBox(height: 16),
                  const Text(
                    'Payment Information',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    key: ValueKey('payment_$_paymentOption'),
                    initialValue: _paymentOption,
                    decoration: const InputDecoration(
                      labelText: 'Payment Option *',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: 'full',
                        child: Text('Full Payment'),
                      ),
                      DropdownMenuItem(
                        value: 'down_payment',
                        child: Text('Down Payment'),
                      ),
                    ],
                    onChanged: _submitting
                        ? null
                        : (value) {
                            setState(() => _paymentOption = value ?? 'full');
                          },
                  ),
                  if (_paymentOption == 'down_payment') ...[
                    const SizedBox(height: 10),
                    TextFormField(
                      controller: _downPaymentController,
                      focusNode: _downPaymentFocus,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: const InputDecoration(
                        labelText: 'Down Payment Amount',
                        border: OutlineInputBorder(),
                      ),
                      validator: _validateDownPayment,
                    ),
                  ],
                  const SizedBox(height: 12),
                  Text('Reservation Fee: PHP ${totalCost.toStringAsFixed(2)}'),
                  Text('Amount to Pay: PHP ${amountToPay.toStringAsFixed(2)}'),
                  const SizedBox(height: 12),
                  _buildCostSummary(
                    facilityPrice: _selectedFacility?.price ?? 0,
                    durationHours: durationHours,
                    totalCost: totalCost,
                    amountToPay: amountToPay,
                  ),
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    onPressed: _submitting ? null : _submit,
                    icon: const Icon(Icons.send),
                    label: Text(
                      _submitting
                          ? 'Submitting...'
                          : 'Submit Reservation Request',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  List<String> _availableEventTypes() {
    final facility = _selectedFacility;
    if (facility == null) return const <String>[];
    if (facility.eventTypes.isNotEmpty) return facility.eventTypes;
    final name = facility.name.trim().toLowerCase();
    if (name == 'medical room') {
      return const [
        'Consultation',
        'Checkup',
        'Vaccination',
        'First Aid',
        'Other',
      ];
    }
    if (name == 'sports complex') {
      return const [
        'Basketball',
        'Volleyball',
        'Badminton',
        'Training',
        'Other',
      ];
    }
    if (name == 'library & learning center') {
      return const [
        'Study Session',
        'Reading Program',
        'Workshop',
        'Seminar',
        'Other',
      ];
    }
    if (name == 'community hall') {
      return const [
        'Birthday Party',
        'Wedding',
        'Conference',
        'Community Event',
        'Other',
      ];
    }
    if (name == 'cultural center') {
      return const [
        'Cultural Show',
        'Workshop',
        'Training',
        'Community Event',
        'Other',
      ];
    }
    if (name == 'garden event space') {
      return const [
        'Wedding',
        'Birthday Party',
        'Reception',
        'Community Event',
        'Other',
      ];
    }
    return const [
      'Birthday Party',
      'Wedding',
      'Conference',
      'Community Event',
      'Sports Activity',
      'Training/Workshop',
      'Other',
    ];
  }

  void _syncEventType() {
    final options = _availableEventTypes();
    if (options.isEmpty) {
      _selectedEventType = '';
    } else if (!options.contains(_selectedEventType)) {
      _selectedEventType = options.first;
    }
  }

  void _syncAddOns() {
    final enabled = (_selectedFacility?.addOns ?? const <FacilityAddOn>[])
        .where((a) => a.enabled)
        .toList();
    final allowedIds = enabled.map((e) => e.id).toSet();
    _selectedAddOnQty.removeWhere((id, _) => !allowedIds.contains(id));
    for (final a in enabled) {
      _selectedAddOnQty.putIfAbsent(a.id, () => 0);
    }
  }

  Future<void> _pickStartDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: DateTime(now.year + 5),
      initialDate: _eventDate ?? now,
    );
    if (picked != null) {
      setState(() {
        _eventDate = picked;
        _eventEndDate ??= picked;
        if (_selectedFacility != null && !_selectedFacility!.allowsMultiDay) {
          _eventEndDate = picked;
        }
      });
    }
  }

  Future<void> _pickEndDate() async {
    final now = DateTime.now();
    final initial = _eventEndDate ?? _eventDate ?? now;
    final picked = await showDatePicker(
      context: context,
      firstDate: _eventDate ?? DateTime(now.year, now.month, now.day),
      lastDate: DateTime(now.year + 5),
      initialDate: initial,
    );
    if (picked != null) {
      setState(() => _eventEndDate = picked);
    }
  }

  Future<void> _pickStartTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _startTime ?? const TimeOfDay(hour: 8, minute: 0),
    );
    if (picked != null) setState(() => _startTime = picked);
  }

  Future<void> _pickEndTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _endTime ?? const TimeOfDay(hour: 9, minute: 0),
    );
    if (picked != null) setState(() => _endTime = picked);
  }

  String _fmtDate(DateTime date) =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  String _fmtTime(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  int? _timeToMinutes(String value) {
    final m = RegExp(r'^(\d{2}):(\d{2})$').firstMatch(value);
    if (m == null) return null;
    final hh = int.tryParse(m.group(1)!);
    final mm = int.tryParse(m.group(2)!);
    if (hh == null || mm == null || hh < 0 || hh > 23 || mm < 0 || mm > 59)
      return null;
    return hh * 60 + mm;
  }

  String? _validateFacilityRules(
    Facility facility,
    DateTime startDt,
    DateTime endDt,
  ) {
    final eventDate = _fmtDate(_eventDate!);
    final eventEndDate = _fmtDate(_eventEndDate ?? _eventDate!);
    final startTime = _fmtTime(_startTime!);
    final endTime = _fmtTime(_endTime!);

    if (!facility.allowsMultiDay && eventDate != eventEndDate) {
      return 'This facility does not allow multi-day reservation.';
    }
    final startMin = _timeToMinutes(startTime);
    final endMin = _timeToMinutes(endTime);
    if (!facility.allowsOvernight &&
        startMin != null &&
        endMin != null &&
        endMin <= startMin) {
      return 'This facility does not allow overnight use.';
    }
    final durationHours = endDt.difference(startDt).inMinutes / 60.0;
    if (!facility.allowsAllDay && durationHours >= 24) {
      return 'This facility does not allow all-day reservation.';
    }
    if (facility.maxDurationHours != null &&
        durationHours > facility.maxDurationHours!) {
      return 'This booking exceeds maximum duration for this facility.';
    }
    if (facility.openingTime.isNotEmpty && facility.closingTime.isNotEmpty) {
      final openingMin = _timeToMinutes(facility.openingTime);
      final closingMin = _timeToMinutes(facility.closingTime);
      if (startMin == null ||
          endMin == null ||
          openingMin == null ||
          closingMin == null) {
        return 'Reservation must be within facility operating hours.';
      }
      final within =
          startMin >= openingMin &&
          startMin <= closingMin &&
          endMin >= openingMin &&
          endMin <= closingMin;
      if (!within)
        return 'Reservation must be within facility operating hours.';
    }
    return null;
  }

  double _estimatedTotal() {
    final facility = _selectedFacility;
    if (facility == null ||
        _eventDate == null ||
        _startTime == null ||
        _endTime == null) {
      return 0;
    }
    final endDate = _eventEndDate ?? _eventDate!;
    final startDt = DateTime(
      _eventDate!.year,
      _eventDate!.month,
      _eventDate!.day,
      _startTime!.hour,
      _startTime!.minute,
    );
    final endDt = DateTime(
      endDate.year,
      endDate.month,
      endDate.day,
      _endTime!.hour,
      _endTime!.minute,
    );
    if (!endDt.isAfter(startDt)) return 0;
    final hours = endDt.difference(startDt).inMinutes / 60.0;
    if (hours <= 0) return 0;
    final addOnCost = _selectedFacility!.addOns.fold<double>(0, (sum, addOn) {
      final qty = _selectedAddOnQty[addOn.id] ?? 0;
      if (!addOn.enabled || qty <= 0) return sum;
      return sum + (qty * addOn.price);
    });
    return double.parse(
      ((hours * facility.price) + addOnCost).toStringAsFixed(2),
    );
  }

  double _estimatedDurationHours() {
    if (_eventDate == null || _startTime == null || _endTime == null) return 0;
    final endDate = _eventEndDate ?? _eventDate!;
    final startDt = DateTime(
      _eventDate!.year,
      _eventDate!.month,
      _eventDate!.day,
      _startTime!.hour,
      _startTime!.minute,
    );
    final endDt = DateTime(
      endDate.year,
      endDate.month,
      endDate.day,
      _endTime!.hour,
      _endTime!.minute,
    );
    if (!endDt.isAfter(startDt)) return 0;
    return endDt.difference(startDt).inMinutes / 60.0;
  }

  Future<void> _submit() async {
    if (!_showValidation) {
      setState(() => _showValidation = true);
    }
    if (!_formKey.currentState!.validate()) {
      _focusFirstInvalidTextField();
      return;
    }
    if (_selectedFacility == null ||
        _eventDate == null ||
        _startTime == null ||
        _endTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Please fill all required reservation schedule fields.',
          ),
        ),
      );
      return;
    }
    if (_selectedEventType.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select event type.')),
      );
      return;
    }
    final endDate = _eventEndDate ?? _eventDate!;
    final startDt = DateTime(
      _eventDate!.year,
      _eventDate!.month,
      _eventDate!.day,
      _startTime!.hour,
      _startTime!.minute,
    );
    final endDt = DateTime(
      endDate.year,
      endDate.month,
      endDate.day,
      _endTime!.hour,
      _endTime!.minute,
    );
    if (!endDt.isAfter(startDt)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('End date/time must be after start date/time.'),
        ),
      );
      return;
    }

    final facilityRuleError = _validateFacilityRules(
      _selectedFacility!,
      startDt,
      endDt,
    );
    if (facilityRuleError != null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(facilityRuleError)));
      return;
    }

    final expectedGuests =
        int.tryParse(_expectedGuestsController.text.trim()) ?? 0;
    if (expectedGuests < 1) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Participants must be at least 1.')),
      );
      return;
    }
    if (expectedGuests > _selectedFacility!.capacity) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Max ${_selectedFacility!.capacity} for this facility.',
          ),
        ),
      );
      return;
    }

    final totalCost = _estimatedTotal();
    final downPayment =
        (double.tryParse(_downPaymentController.text.trim()) ?? 0).clamp(
          0,
          totalCost,
        );
    if (_paymentOption == 'down_payment' && downPayment <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Down payment must be greater than 0.')),
      );
      return;
    }

    final hasConflict = _hasScheduleConflict(
      facilityId: _selectedFacility!.id,
      start: startDt,
      end: endDt,
    );
    if (hasConflict) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'This facility is already reserved for the selected time.',
          ),
        ),
      );
      return;
    }

    final additionalNotes = _additionalNotesController.text.trim();
    final purpose = _purposeController.text.trim();
    final clientAddress = _clientAddressController.text.trim();
    final organization = _organizationController.text.trim();
    final eventDescriptionParts = <String>[
      'Purpose of Event: $purpose',
      if (clientAddress.isNotEmpty) 'Client Address: $clientAddress',
      if (organization.isNotEmpty) 'Organization: $organization',
      if (additionalNotes.isNotEmpty) 'Additional Notes: $additionalNotes',
    ];
    final payload = <String, Object?>{
      'username': _clientNameController.text.trim(),
      'clientEmail': _clientEmailController.text.trim(),
      'facilityId': _selectedFacility!.id,
      'eventDate': _fmtDate(_eventDate!),
      'eventEndDate': _fmtDate(endDate),
      'startTime': _fmtTime(_startTime!),
      'endTime': _fmtTime(_endTime!),
      'eventType': _selectedEventType,
      'expectedGuests': expectedGuests,
      'eventDescription': eventDescriptionParts.join('\n'),
      'contactPerson': _clientNameController.text.trim(),
      'contactPhone': _contactPhoneController.text.trim(),
      'clientAddress': clientAddress,
      'organization': organization,
      'medicalRoomDetails': _medicalRoomDetailsController.text.trim(),
      'addOns': _selectedAddOnQty.entries
          .where((e) => e.value > 0)
          .map((e) => <String, Object?>{'id': e.key, 'qty': e.value})
          .toList(),
      'paymentOption': _paymentOption,
      'downPaymentAmount': _paymentOption == 'down_payment' ? downPayment : 0,
      'totalCost': totalCost,
    };

    setState(() => _submitting = true);
    try {
      await widget.onCreateReservation(payload);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Reservation submitted successfully. Awaiting approval.',
          ),
        ),
      );
      _purposeController.clear();
      _additionalNotesController.clear();
      _medicalRoomDetailsController.clear();
      _selectedAddOnQty.updateAll((key, value) => 0);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(uiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  String? _validateClientName(String? v) {
    final value = (v ?? '').trim();
    if (value.length < 3) return 'Enter valid client name';
    if (!RegExp(r"^[A-Za-z\s.'-]+$").hasMatch(value)) {
      return 'Letters, spaces, apostrophe, dot, hyphen only';
    }
    return null;
  }

  String? _validateClientAddress(String? v) =>
      (v ?? '').trim().length < 5 ? 'Enter complete address' : null;

  String? _validateContactPhone(String? v) {
    final value = (v ?? '').trim();
    if (!RegExp(r'^\d{10,13}$').hasMatch(value)) return 'Use 10-13 digits';
    return null;
  }

  String? _validateClientEmail(String? v) {
    final value = (v ?? '').trim();
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value))
      return 'Enter valid email';
    return null;
  }

  String? _validatePurpose(String? v) =>
      (v ?? '').trim().length < 3 ? 'Enter a clear event purpose' : null;

  String? _validateExpectedGuests(String? v) {
    final parsed = int.tryParse((v ?? '').trim());
    if (parsed == null || parsed < 1) return 'Participants must be at least 1';
    if (_selectedFacility != null && parsed > _selectedFacility!.capacity) {
      return 'Max ${_selectedFacility!.capacity} for this facility';
    }
    return null;
  }

  String? _validateMedicalRoomDetails(String? value) {
    final v = (value ?? '').trim();
    if ((_selectedFacility?.name.toLowerCase() ?? '') == 'medical room' &&
        v.isEmpty) {
      return 'Please specify room/need';
    }
    return null;
  }

  String? _validateDownPayment(String? value) {
    final d = double.tryParse((value ?? '').trim()) ?? 0;
    if (d <= 0) return 'Down payment must be greater than 0';
    if (_estimatedTotal() > 0 && d > _estimatedTotal()) {
      return 'Down payment cannot exceed reservation fee';
    }
    return null;
  }

  void _focusFirstInvalidTextField() {
    if (_validateClientName(_clientNameController.text) != null) {
      _clientNameFocus.requestFocus();
      return;
    }
    if (_validateClientAddress(_clientAddressController.text) != null) {
      _clientAddressFocus.requestFocus();
      return;
    }
    if (_validateContactPhone(_contactPhoneController.text) != null) {
      _contactPhoneFocus.requestFocus();
      return;
    }
    if (_validateClientEmail(_clientEmailController.text) != null) {
      _clientEmailFocus.requestFocus();
      return;
    }
    if (_validatePurpose(_purposeController.text) != null) {
      _purposeFocus.requestFocus();
      return;
    }
    if (_validateExpectedGuests(_expectedGuestsController.text) != null) {
      _expectedGuestsFocus.requestFocus();
      return;
    }
    if (_validateMedicalRoomDetails(_medicalRoomDetailsController.text) !=
        null) {
      _medicalRoomDetailsFocus.requestFocus();
      return;
    }
    if (_paymentOption == 'down_payment' &&
        _validateDownPayment(_downPaymentController.text) != null) {
      _downPaymentFocus.requestFocus();
    }
  }

  bool _hasScheduleConflict({
    required int facilityId,
    required DateTime start,
    required DateTime end,
  }) {
    for (final r in widget.existingReservations) {
      if (r.facilityId != facilityId) continue;
      final status = r.status.toLowerCase();
      if (status != 'pending' && status != 'approved') continue;
      final rStart = DateTime.tryParse('${r.eventDate} ${r.startTime}:00');
      final rEnd = DateTime.tryParse('${r.eventEndDate} ${r.endTime}:00');
      if (rStart == null || rEnd == null) continue;
      final overlap =
          !(end.isAtSameMomentAs(rStart) ||
              end.isBefore(rStart) ||
              start.isAtSameMomentAs(rEnd) ||
              start.isAfter(rEnd));
      if (overlap) return true;
    }
    return false;
  }

  Widget _buildFacilityRulesHint() {
    final f = _selectedFacility;
    if (f == null) return const SizedBox.shrink();
    final rules = <String>[
      'Open: ${f.openingTime.isEmpty ? 'No set hours' : f.openingTime}',
      'Close: ${f.closingTime.isEmpty ? 'No set hours' : f.closingTime}',
      'Overnight: ${f.allowsOvernight ? 'Allowed' : 'Not Allowed'}',
      'All-day: ${f.allowsAllDay ? 'Allowed' : 'Not Allowed'}',
      'Multi-day: ${f.allowsMultiDay ? 'Allowed' : 'Not Allowed'}',
      'Max Duration: ${f.maxDurationHours == null ? 'No max limit' : '${f.maxDurationHours} hour(s)'}',
    ];
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.blueGrey.shade50,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: rules
            .map((e) => Text(e, style: const TextStyle(fontSize: 12)))
            .toList(),
      ),
    );
  }

  Widget _buildAddOnsSection() {
    final addOns = (_selectedFacility?.addOns ?? const <FacilityAddOn>[])
        .where((a) => a.enabled)
        .toList();
    if (addOns.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Align(
          alignment: Alignment.centerLeft,
          child: Text(
            'Facility Add-ons (Optional)',
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
        const SizedBox(height: 8),
        ...addOns.map((a) {
          final qty = _selectedAddOnQty[a.id] ?? 0;
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          a.name,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        Text('PHP ${a.price.toStringAsFixed(2)} per ${a.unit}'),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: _submitting || qty <= 0
                        ? null
                        : () =>
                              setState(() => _selectedAddOnQty[a.id] = qty - 1),
                    icon: const Icon(Icons.remove_circle_outline),
                  ),
                  Text(
                    '$qty',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  IconButton(
                    onPressed: _submitting
                        ? null
                        : () =>
                              setState(() => _selectedAddOnQty[a.id] = qty + 1),
                    icon: const Icon(Icons.add_circle_outline),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildCostSummary({
    required double facilityPrice,
    required double durationHours,
    required double totalCost,
    required double amountToPay,
  }) {
    String durationLabel = '-';
    if (durationHours > 0) {
      final days = durationHours ~/ 24;
      final hours = durationHours - (days * 24);
      durationLabel = days > 0
          ? '${days}d ${hours.toStringAsFixed(1)}h'
          : '${hours.toStringAsFixed(1)}h';
    }
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Facility Price: PHP ${facilityPrice.toStringAsFixed(2)}'),
          Text('Duration: $durationLabel'),
          Text('Total Cost: PHP ${totalCost.toStringAsFixed(2)}'),
          Text('Amount to Pay: PHP ${amountToPay.toStringAsFixed(2)}'),
        ],
      ),
    );
  }
}
