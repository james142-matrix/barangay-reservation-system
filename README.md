# 🏛️ Barangay Molugan Facility Reservation System

A complete, modern, and fully functional facility reservation management system for Barangay Molugan. Built with vanilla JavaScript, HTML5, and CSS3.

---

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [System Features](#system-features)
3. [User Roles & Access](#user-roles--access)
4. [Demo Credentials](#demo-credentials)
5. [File Structure](#file-structure)
6. [Database System](#database-system)
7. [Key Features Guide](#key-features-guide)
8. [Architecture](#architecture)

---

## 🚀 Quick Start

### Installation
1. Clone/download this repository
2. Open `index.html` in any modern web browser
3. System will auto-initialize with demo data on first load

### No Server Required
This is a fully client-side application using browser's `localStorage` as the database. No backend server or installation needed!

---

## ✨ System Features

### ✅ Complete Authentication System
- **Login Page**: Admin and Resident login with demo credentials provided
- **Signup Page**: New resident registration with comprehensive validation
- **Session Management**: Secure role-based session handling
- **Auto-logout**: Session management with activity tracking

### ✅ Resident Features
- **Email‑Authenticated Login**: Users sign in with username and password; the account’s email must have been verified during signup. During registration the system "sends" a six‑digit code to the provided email (displayed on screen in this demo). Users cannot log in until they enter the correct verification code. If they forget their password they can request an OTP via the forgot‑password page; a simple math captcha guards the request. Firebase integration is optional; if no valid API key is provided the system falls back to local storage authentication.
- **Dashboard**: Personal statistics and quick access to options
  - Total reservations count
  - Approved reservations
  - Pending approval count
  - Rejected count
- **Browse Facilities**: View all available barangay facilities with detailed information
  - 6 pre-configured facilities
  - Capacity information
  - Hourly rental rates
  - Facility icons for visual identification
- **Make Reservation**: Full booking system with real-time cost calculation
  - Facility selection
  - Date & time slot selection
  - Event type classification
  - Expected guest count
  - Event description
  - Contact information
  - Real-time cost calculation based on duration
  - Automatic duplicate booking prevention
- **My Reservations**: Complete reservation management
  - View all personal reservations
  - Filter by status (all, pending, approved, rejected)
  - Detailed reservation view with all information
  - Cancel pending reservations
  - View rejection reasons if applicable
- **Billing Dashboard (Resident)**: Handle payments after approval (online or cash on site)
  - Residents wait for admin/staff approval
  - Once approved they can visit `billing.html` to settle the balance (link now appears in nav/sidebar and on the dashboard)
  - Dashboard widget shows current count of unpaid reservations and links directly to billing
  - Buttons let users "Pay Online" (simulated) or "Mark as Paid (Cash)" for walk‑in payments
  - Cost is calculated automatically based on duration
  - After payment the reservation status transitions to **completed/paid** and the item leaves the billing table
  - A notification is created for every successful payment so the badge and panel update accordingly
- **Billing Dashboard (Admin/Staff)**: View and record payments for all users
  - Available under the "Billing" link in the admin/staff interface
  - Lists every approved reservation that has not yet been paid, across all residents
  - Staff can mark any reservation as paid on behalf of the resident
  - Recording a payment sends a notification to the resident and transitions the status to **completed/paid**
  - Useful when residents pay in person or when staff need to reconcile offline transactions

### ✅ Admin Features
- **Admin Dashboard**: System overview and quick statistics
  - Total reservations count
  - Pending approval count
  - Approved reservations
  - Rejected count
  - Quick link to pending requests
- **Approval Requests**: Review and approve/reject reservations
  - List all reservation requests with filtering
  - Search by resident name or facility
  - Detailed reservation review modal
  - Conflict detection (warns if multiple approved on same time)
  - Approve reservations with one click
  - Reject with custom reason
  - View status of all requests
- **Reports Analytics**: System analytics and insights
  - Total reservations statistics
  - Facility usage breakdown
  - Top residents by reservation count
  - Status breakdown percentages
  - Monthly trend analysis
  - Detailed reservation history table

### ✅ Modern User Interface
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Professional Styling**: Modern gradient theme with smooth animations
- **Intuitive Navigation**: Sidebar + navbar for easy access
- **User Feedback**: Toast notifications for all actions
- **Status Badges**: Color-coded status indicators (green=approved, orange=pending, red=rejected)
- **Modal Dialogs**: Clean popups for detailed operations
- **Real-time Calculations**: Cost summary updates as user inputs change

---

## 👥 User Roles & Access

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Access**: Admin Dashboard, Approval Requests, Reports, Facility Management

### Demo Resident Account
- **Username**: `resident1`
- **Password**: `resident123`
- **Email**: `resident1@barangay.ph`
- **Access**: Resident Dashboard, Browse Facilities, Make Reservations, My Reservations

---

## 🔐 Demo Credentials

### For Testing
You can use these pre-configured accounts to test the system:

**Admin Login:**
```
Username: admin
Password: admin123
```

**Resident Login:**
```
Username: resident1
Password: resident123
```

**Create New Account:**
- Click "Don't have an account? Sign up" on login page
- Create resident account with full validation
- All fields required: Full Name, Email, Phone, Address, Username, Password

---

## 📁 File Structure

```
barangay-reservation-system/
├── index.html                    # Login page (entry point)
├── signup.html                  # Registration page
├── resident-dashboard.html      # Resident home
├── facilities.html              # Browse facilities
├── reserve.html                 # Make reservation
├── my-reservations.html         # Manage reservations
├── admin-dashboard.html         # Admin home
├── admin-requests.html          # Approve/reject
├── reports.html                 # View analytics
├── css/
│   └── style.css               # Complete styling system (750+ lines)
├── js/
│   ├── database.js             # LocalStorage database layer
│   ├── auth.js                 # Authentication utilities
│   ├── login.js                # Login logic
│   ├── signup.js               # Registration logic
│   ├── resident-dashboard.js   # Dashboard logic
│   ├── facilities.js           # Facility browsing
│   ├── reserve.js              # Reservation form
│   ├── my-reservations.js      # Reservation management
│   ├── admin-dashboard.js      # Admin overview
│   ├── admin-requests.js       # Approval logic
│   └── reports.js              # Analytics logic
├── images/                      # Placeholder images
├── README.md                    # This file
└── [deleted Font Awesome refs]  # Uses emoji instead
```

---

## 💾 Database System

### Storage
- **Key**: `barangayDB` in browser's localStorage
- **Data Format**: JSON
- **Persistence**: Automatic browser storage (survives page refresh)
- **Initialization**: Auto-creates sample data if not found

### Database Structure
```javascript
barangayDB: {
  users: [
    {
      id: 1,
      fullname: "String",
      email: "String",
      phone: "String",
      address: "String",
      username: "String",
      password: "String",
      role: "resident",
      createdAt: "ISO-date"
    }
  ],
  facilities: [6 pre-configured facilities],
  reservations: [
    {
      id: "unique-id",
      username: "String",
      facilityId: "facility-id",
      eventDate: "YYYY-MM-DD",
      startTime: "HH:MM",
      endTime: "HH:MM",
      eventType: "String",
      expectedGuests: "Number",
      eventDescription: "String",
      contactPerson: "String",
      contactPhone: "String",
      status: "pending|approved|rejected",
      createdAt: "ISO-date",
      approvedAt: "ISO-date",
      approvedBy: "admin-username",
      rejectionReason: "String",
      rejectedAt: "ISO-date",
      rejectedBy: "admin-username"
    }
  ]
}
```

### Pre-configured Facilities
1. **Community Hall** - ₱2,000/hour (Capacity: 100)
2. **Sports Complex** - ₱1,500/hour (Capacity: 80)
3. **Cultural Center** - ₱1,000/hour (Capacity: 60)
4. **Library & Learning Center** - ₱500/hour (Capacity: 50)
5. **Medical Room** - ₱800/hour (Capacity: 20)
6. **Garden Event Space** - ₱2,500/hour (Capacity: 150)

---

## 🎯 Key Features Guide

### Making a Reservation (Resident)
1. Login with resident account
2. Click "Make Reservation"
3. Select facility from dropdown
4. Choose event date
5. Select start and end time
6. Watch cost calculate automatically
7. Fill event details (type, guests, description)
8. Enter contact information
9. Click "Submit Reservation"
10. Wait for admin approval

### Approving Reservations (Admin)
1. Login with admin account
2. Go to "Approval Requests"
3. Review pending requests in table
4. Click "Review" to see full details
5. Check for time conflicts (highlighted in yellow)
6. Either "Approve" or "Reject" with reason
7. Resident automatically sees status in "My Reservations"

### Viewing Reports (Admin)
1. Login with admin account
2. Go to "Reports"
3. Select date range (This Month, Last 3 Months, etc.)
4. View statistics, facility usage, top residents
5. See monthly trends and full reservation table

---

## 🏗️ Architecture

### Frontend
- **Pure JavaScript**: No frameworks, vanilla JS for simplicity and control
- **CSS3**: Modern responsive design with CSS Grid and Flexbox
- **HTML5**: Semantic markup with proper form validation

### Authentication
- **Session-based**: localStorage stores user role and username
- **Role-based Access**: Different pages for admin vs resident
- **Auto-redirect**: Protected pages redirect to login if not authenticated

### Data Flow
1. User Action → JavaScript Event Handler
2. Validation & Processing
3. Database Operation (localStorage read/write)
4. UI Update (DOM manipulation)
5. User Feedback (toast notification)

### Key Design Patterns
- **MVC-lite**: Separation between data (database.js), logic (page JS files), view (HTML)
- **Singleton Database**: Single source of truth using centralized database.js
- **Modal Dialogs**: CSS-driven visibility with class toggling
- **Event Delegation**: Centralized event listeners where possible
- **Defensive Programming**: Null checks, empty state handling, validation at multiple levels

---

## 🎨 Design Theme

### Color Scheme
- **Primary Purple**: #667eea - Main accent color
- **Secondary Purple**: #764ba2 - Gradient end
- **Success Green**: #28a745 - Approved status
- **Warning Orange**: #ffa500 - Pending status
- **Danger Red**: #ff6b6b - Rejected status

### Typography
- **Font**: System fonts for optimal performance
- **Hierarchy**: Clear size and weight differentiation
- **Accessibility**: High contrast, readable on all screen sizes

### Spacing
- **Consistent 15px padding** on cards and containers
- **20px gap** between grid items
- **30px main-content padding** for breathing room

---

## 📱 Responsive Breakpoints

- **Desktop**: Full 3-column layouts
- **Tablet** (768px): 2-column layouts
- **Mobile** (480px): 1-column stacked layouts
- **Sidebar**: Collapsible (CSS ready for JS implementation)
- **Navigation**: Sticky navbar on all devices

---

## 🔧 Technical Details

### No External Dependencies
- No jQuery, no Bootstrap, no libraries
- 100% vanilla JavaScript
- Pure CSS (no SASS/LESS)
- HTML5 form elements

### Browser Compatibility
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

### Storage Limits
- LocalStorage: ~5MB per domain (sufficient for thousands of reservations)
- Data clears if user clears browser cache
- Consider backing up important data periodically

---

## 🚀 Deployment

### For Production
1. Implement backend API (Node.js/Express, Python/Flask, etc.)
2. Replace localStorage calls with API endpoints
3. Add database (PostgreSQL, MongoDB, etc.)
4. Implement proper authentication (JWT, OAuth)
5. Add SSL/HTTPS
6. Set up hosting (Vercel, Netlify, AWS, etc.)

### For Local Testing
Simply open `index.html` in any web browser. No setup required!

---

## 📊 Statistics Capabilities

The system tracks:
- **Total Reservations**: Count of all bookings
- **Reservations by Status**: Approved, Pending, Rejected
- **Facility Usage**: Bookings per facility
- **Resident Activity**: Reservation count per resident
- **Monthly Trends**: Bookings over time
- **Peak Facilities**: Most popular facilities
- **Approval Rate**: Percentage of approved vs rejected

---

## 🛡️ Security Notes

### Current Implementation (Development)
- Passwords stored in localStorage (plaintext for demo)
- No encryption (development only)
- Basic username/password validation

### Production Recommendations
- Hash passwords with bcrypt
- Implement JWT/OAuth for sessions
- Use HTTPS only
- Validate input on backend
- Implement CORS properly
- Add rate limiting
- Regular security audits

---

## 📝 Testing Workflow

### Complete User Journey
1. **Signup**: Create new resident account
2. **Login**: Login with new account
3. **Browse**: Browse available facilities
4. **Reserve**: Book a facility for specific date/time
5. **Manage**: View reservation in My Reservations
6. **Admin Review**: Login as admin to review request
7. **Approve**: Approve reservation as admin
8. **Confirmation**: See status change in My Reservations
9. **Reports**: View analytics in Reports page

### Edge Cases to Test
- Double-booking prevention (same facility, same time)
- Capacity validation (guest count vs facility capacity)
- Date validation (no past dates, etc.)
- Time validation (end time > start time)
- Filter and search operations
- Status transitions
- Modal open/close
- Logout and re-login

---

## 🎓 Learning Resources

This project demonstrates:
- DOM manipulation and events
- LocalStorage/browser APIs
- Form validation and error handling
- Responsive CSS Grid/Flexbox
- Component-based thinking
- Data structure design
- User authentication patterns
- CRUD operations
- Filtering and searching
- Modal dialogs
- Toast notifications

---

## 📞 Support

For issues or questions about the system:
1. Check README.md (you are here!)
2. Review database.js for data structure
3. Check console.log() outputs for debugging
4. Verify localStorage via browser DevTools

---

## ✅ System Status

**Overall Completion**: 100%

### Fully Implemented ✅
- ✅ Authentication system
- ✅ Resident features (dashboard, browse, reserve, manage)
- ✅ Admin features (dashboard, approval, reports)
- ✅ Database system (storage, CRUD, queries)
- ✅ User interface (modern, responsive, intuitive)
- ✅ Form validation (all inputs validated)
- ✅ Error handling (graceful error recovery)
- ✅ Status tracking (pending → approved/rejected)
- ✅ Real-time cost calculation
- ✅ Duplicate booking prevention

### Ready for Defense! 🎉

---

**Last Updated**: 2024
**Version**: 1.0.0 (Final)
**Status**: Production Ready for Demo


### ✅ Approval Workflow
- Admin can review all pending reservation requests
- Admin can approve or reject requests
- Automatic notifications sent to residents when status changes

### ✅ Notification System
- Real-time notifications for residents when reservations are approved/rejected
- Notification badge showing unread count
- Notification history with timestamps

### ✅ Report Generation
- Summary statistics (total, approved, pending, rejected)
- Facility usage report with breakdown by status
- Top facilities by booking count
- Daily reservation trend analysis
- Export reports to CSV format

### ✅ Data Accuracy & Validation
- Input validation on all forms
- Data stored in browser localStorage
- Proper date/time format handling
- Status tracking throughout reservation lifecycle

---

## Getting Started

### For Admin Users:

1. **Login**: Username: `admin`, Password: `admin123`
2. **First Steps**:
   - Go to "Facilities" to add barangay facilities
   - Review pending requests in "Requests" section
   - Monitor system health from Dashboard
   - View analytics in "Reports" section

### For Resident Users:

1. **Create Account**: Click "Sign Up" on login page
   - Choose a username (3-20 characters, alphanumeric + underscore)
   - Set a password (minimum 6 characters)
   - Submit to create account

2. **Make Reservation**:
   - Login with your credentials
   - Click "Reserve Facility"
   - Select facility, date, and available time slot
   - Add purpose of reservation
   - Submit request

3. **Manage Reservations**:
   - Go to "My Reservations" to view all your bookings
   - Edit or cancel pending requests
   - Filter by status to see approved/rejected reservations
   - View when your request was submitted

4. **Check Notifications**:
   - Click notification bell icon (🔔) in top right
   - View approval/rejection status of your reservations
   - See timestamps for when notifications were sent

---

## How It Works

### Reservation Flow:

1. **Submit** → Resident submits reservation request
2. **Pending** → Request waits for admin approval
3. **Review** → Admin checks availability and details
4. **Approve/Reject** → Admin makes final decision
5. **Notify** → Resident receives notification
6. **Confirmed** → Reservation is approved or rejected

### Available Time Slots:

- System prevents overbooking
- Only available times are shown to residents
- Operating hours: 8:00 AM to 5:00 PM (1-hour slots)
- Handles both approved and pending reservations

---

## Data Storage

All data is stored in your browser's localStorage:
- **users**: Registered resident accounts
- **facilities**: Barangay facilities
- **reservations**: All booking records
- **notifications**: Notification history

**Note**: Data persists across browser sessions but will be cleared if browser cache is cleared.

---

## Admin Reports

### Available Reports:

1. **Summary Statistics**: Overview of all reservations
2. **Facility Usage**: Breakdown by facility and status
3. **Top Facilities**: Most booked facilities
4. **Daily Trend**: Reservations per day
5. **CSV Export**: Download data for further analysis

### Report Filtering:
- Filter by date range for specific analysis
- Real-time updates as new reservations are processed

---

## Security Features

✓ Input validation on all forms
✓ Username uniqueness checking
✓ Password minimum length requirement
✓ Role-based access control (prevents unauthorized access)
✓ Session management via localStorage
✓ Admin account is protected and cannot be registered by users

---

## Troubleshooting

### "Invalid Username or Password"
- Ensure you're using the correct credentials
- Check that CAPS LOCK is off
- For admin, use: `admin` / `admin123`

### "Username already exists"
- Choose a different username
- Usernames are case-sensitive

### Reservation not saving
- Check internet connection and browser localStorage access
- Ensure all required fields are filled
- Try clearing browser cache (note: this will delete stored data)

### No available time slots
- All slots for that facility on that date are booked
- Try a different date or facility
- Contact admin for assistance

---

## Contact & Support

For questions or issues with the system, please contact the Barangay administration office.

---

## Module/Page Guide

### Pages & What They Do:

| Page | Who Uses It | What It Does |
|------|-------------|-------------|
| **index.html** | Everyone | Login page - Enter username and password |
| **signup.html** | New users | Create new account - Choose username and password |
| **resident-dashboard.html** | Residents | Main page for residents - View options to reserve, check reservations, see notifications |
| **admin-dashboard.html** | Admins | Main page for admins - Access all admin tools and features |
| **reserve.html** | Residents | Book a facility - Select facility, date, time, and provide purpose |
| **my-reservations.html** | Residents | View your bookings - See all your reservations and edit/cancel them |
| **facilities.html** | Admins | Manage facilities - Add new facilities or delete existing ones |
| **admin-requests.html** | Admins | View requests - See all reservation requests and approve/reject them |
| **reports.html** | Admins | View analytics - Check statistics, usage reports, and download data |

### JavaScript Files & What They Handle:

| File | What It Does |
|------|-------------|
| **auth.js** | Handles login and user role checking |
| **login.js** | Login page form and validation |
| **signup.js** | Sign up page form and new account creation |
| **resident-dashboard.js** | Resident home page features |
| **admin-dashboard.js** | Admin home page features |
| **reserve.js** | Reservation form and booking logic |
| **my-reservations.js** | View and manage your reservations |
| **facilities.js** | Add and delete facilities |
| **admin-requests.js** | View and approve/reject requests |
| **reports.js** | Generate reports and charts |

---

**Last Updated**: February 15, 2026
**System Version**: 2.0 (Enhanced with Full Features)
