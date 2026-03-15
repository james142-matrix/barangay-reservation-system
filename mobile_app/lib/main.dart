import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Rubric',
      home: const RubricPage(),
    );
  }
}

class RubricPage extends StatelessWidget {
  const RubricPage({super.key});

  @override
  Widget build(BuildContext context) {
    final headers = const [
      'Criteria',
      'Excellent (4 pts)',
      'Good (3 pts)',
      'Satisfactory (2 pts)',
      'Needs Improvement (1 pt)',
    ];

    final rows = const [
      [
        'Correct Flow / Navigation',
        'All screens flow logically; navigation is intuitive',
        'Minor navigation issues; user can mostly navigate',
        'Some screens hard to access; inconsistent flow',
        'Navigation is confusing; user cannot complete tasks easily',
      ],
      [
        'Functionality',
        'All features work as intended; meets all requirements',
        'Most features work; minor bugs present',
        'Some features work; noticeable bugs affect usability',
        'Most features do not work; app largely non-functional',
      ],
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('ITE 393 Rubric')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'ITE 393 Mobile Application Development Project Rubric (Client/User-Side)',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columns: headers.map((h) => DataColumn(label: Text(h))).toList(),
                rows: rows
                    .map(
                      (r) => DataRow(
                        cells: r
                            .map((c) => DataCell(SizedBox(width: 220, child: Text(c))))
                            .toList(),
                      ),
                    )
                    .toList(),
                border: TableBorder.all(color: Colors.black45),
                dataRowMinHeight: 70,
                dataRowMaxHeight: 120,
              ),
            ),
            const SizedBox(height: 16),
            const Text('Scoring Guide', style: TextStyle(fontWeight: FontWeight.bold)),
            const Text('• 32–28 pts -> Excellent / Outstanding'),
            const Text('• 27–22 pts -> Good / Above Average'),
            const Text('• 21–16 pts -> Satisfactory / Average'),
            const Text('• 15–8 pts -> Needs Improvement'),
          ],
        ),
      ),
    );
  }
}
