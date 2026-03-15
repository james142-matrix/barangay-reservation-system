class Facility {
  final int id;
  final String name;
  final String description;
  final int capacity;
  final double price;
  final String status;
  final List<String> eventTypes;
  final List<FacilityAddOn> addOns;
  final String openingTime;
  final String closingTime;
  final bool allowsOvernight;
  final bool allowsAllDay;
  final bool allowsMultiDay;
  final int? maxDurationHours;

  const Facility({
    required this.id,
    required this.name,
    required this.description,
    required this.capacity,
    required this.price,
    required this.status,
    required this.eventTypes,
    required this.addOns,
    required this.openingTime,
    required this.closingTime,
    required this.allowsOvernight,
    required this.allowsAllDay,
    required this.allowsMultiDay,
    required this.maxDurationHours,
  });

  factory Facility.fromJson(Map<String, dynamic> json) {
    final rawEventTypes = json['eventTypes'];
    final eventTypes = rawEventTypes is List
        ? rawEventTypes
              .map((e) => e.toString())
              .where((e) => e.trim().isNotEmpty)
              .toList()
        : <String>[];
    final rawAddOns = json['addOns'];
    final addOns = rawAddOns is List
        ? rawAddOns
              .whereType<Map>()
              .map((e) => FacilityAddOn.fromJson(Map<String, dynamic>.from(e)))
              .toList()
        : <FacilityAddOn>[];

    return Facility(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: (json['name'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      capacity: (json['capacity'] as num?)?.toInt() ?? 0,
      price: (json['price'] as num?)?.toDouble() ?? 0,
      status: (json['status'] ?? '').toString(),
      eventTypes: eventTypes,
      addOns: addOns,
      openingTime: (json['openingTime'] ?? '').toString(),
      closingTime: (json['closingTime'] ?? '').toString(),
      allowsOvernight: json['allowsOvernight'] == true,
      allowsAllDay: json['allowsAllDay'] == true,
      allowsMultiDay: json['allowsMultiDay'] == true,
      maxDurationHours: (json['maxDurationHours'] as num?)?.toInt(),
    );
  }
}

class FacilityAddOn {
  final String id;
  final String name;
  final double price;
  final String unit;
  final bool enabled;

  const FacilityAddOn({
    required this.id,
    required this.name,
    required this.price,
    required this.unit,
    required this.enabled,
  });

  factory FacilityAddOn.fromJson(Map<String, dynamic> json) {
    return FacilityAddOn(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      price: (json['price'] as num?)?.toDouble() ?? 0,
      unit: (json['unit'] ?? 'item').toString(),
      enabled: json['enabled'] != false,
    );
  }
}
