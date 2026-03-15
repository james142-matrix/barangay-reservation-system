class Reservation {
  final int id;
  final String username;
  final String clientEmail;
  final int? facilityId;
  final String eventDate;
  final String eventEndDate;
  final String startTime;
  final String endTime;
  final String eventType;
  final int expectedGuests;
  final String eventDescription;
  final String contactPerson;
  final String contactPhone;
  final String medicalRoomDetails;
  final String paymentOption;
  final double downPaymentAmount;
  final double amountPaid;
  final double totalCost;
  final String status;
  final String paymentStatus;
  final String createdAt;
  final String rejectionReason;
  final List<ReservationAddOn> addOns;
  final double addOnTotal;

  const Reservation({
    required this.id,
    required this.username,
    required this.clientEmail,
    required this.facilityId,
    required this.eventDate,
    required this.eventEndDate,
    required this.startTime,
    required this.endTime,
    required this.eventType,
    required this.expectedGuests,
    required this.eventDescription,
    required this.contactPerson,
    required this.contactPhone,
    required this.medicalRoomDetails,
    required this.paymentOption,
    required this.downPaymentAmount,
    required this.amountPaid,
    required this.totalCost,
    required this.status,
    required this.paymentStatus,
    required this.createdAt,
    required this.rejectionReason,
    required this.addOns,
    required this.addOnTotal,
  });

  factory Reservation.fromJson(Map<String, dynamic> json) {
    final rawAddOns = json['addOns'];
    final addOns = rawAddOns is List
        ? rawAddOns
              .whereType<Map>()
              .map(
                (e) => ReservationAddOn.fromJson(Map<String, dynamic>.from(e)),
              )
              .toList()
        : <ReservationAddOn>[];
    return Reservation(
      id: (json['id'] as num?)?.toInt() ?? 0,
      username: (json['username'] ?? '').toString(),
      clientEmail: (json['clientEmail'] ?? '').toString(),
      facilityId: (json['facilityId'] as num?)?.toInt(),
      eventDate: (json['eventDate'] ?? '').toString(),
      eventEndDate: (json['eventEndDate'] ?? '').toString(),
      startTime: (json['startTime'] ?? '').toString(),
      endTime: (json['endTime'] ?? '').toString(),
      eventType: (json['eventType'] ?? '').toString(),
      expectedGuests: (json['expectedGuests'] as num?)?.toInt() ?? 0,
      eventDescription: (json['eventDescription'] ?? '').toString(),
      contactPerson: (json['contactPerson'] ?? '').toString(),
      contactPhone: (json['contactPhone'] ?? '').toString(),
      medicalRoomDetails: (json['medicalRoomDetails'] ?? '').toString(),
      paymentOption: (json['paymentOption'] ?? '').toString(),
      downPaymentAmount: (json['downPaymentAmount'] as num?)?.toDouble() ?? 0,
      amountPaid: (json['amountPaid'] as num?)?.toDouble() ?? 0,
      totalCost: (json['totalCost'] as num?)?.toDouble() ?? 0,
      status: (json['status'] ?? '').toString(),
      paymentStatus: (json['paymentStatus'] ?? '').toString(),
      createdAt: (json['createdAt'] ?? '').toString(),
      rejectionReason: (json['rejectionReason'] ?? '').toString(),
      addOns: addOns,
      addOnTotal: (json['addOnTotal'] as num?)?.toDouble() ?? 0,
    );
  }

  bool get isFullyPaid {
    final status = paymentStatus.toLowerCase();
    return status == 'paid' || status == 'cash' || amountPaid >= totalCost;
  }

  double get computedAddOnTotal {
    if (addOnTotal > 0) return addOnTotal;
    return addOns.fold<double>(0, (sum, item) => sum + item.total);
  }
}

class ReservationAddOn {
  final String id;
  final String name;
  final String unit;
  final int qty;
  final double price;
  final double total;

  const ReservationAddOn({
    required this.id,
    required this.name,
    required this.unit,
    required this.qty,
    required this.price,
    required this.total,
  });

  factory ReservationAddOn.fromJson(Map<String, dynamic> json) {
    final qty = (json['qty'] as num?)?.toInt() ?? 0;
    final price = (json['price'] as num?)?.toDouble() ?? 0;
    return ReservationAddOn(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      unit: (json['unit'] ?? 'item').toString(),
      qty: qty,
      price: price,
      total: (json['total'] as num?)?.toDouble() ?? (qty * price),
    );
  }
}
