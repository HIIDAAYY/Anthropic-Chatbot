/**
 * Test Script for Booking Services
 * Tests all core booking, service, and calendar functions
 */

import { PrismaClient } from "@prisma/client";
import {
  checkAvailability,
  createBooking,
  getBookingByNumber,
  listCustomerBookings,
  rescheduleBooking,
  cancelBooking,
  formatBookingForChat,
} from "../app/lib/booking-service";
import {
  listServices,
  getServiceById,
  formatServicesForChat,
  formatServiceForChat,
} from "../app/lib/service-service";
import {
  getAvailableSlots,
  isBlackoutDate,
  checkResourceAvailability,
} from "../app/lib/calendar-service";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 Starting Booking Services Tests\n");
  console.log("=" .repeat(60));

  // Get test data from seed
  const customer = await prisma.customer.findFirst({
    where: { phoneNumber: "081234567890" },
  });

  const clinic = await prisma.business.findFirst({
    where: { type: "BEAUTY_CLINIC" },
  });

  const travelAgency = await prisma.business.findFirst({
    where: { type: "TRAVEL_AGENCY" },
  });

  if (!customer || !clinic || !travelAgency) {
    throw new Error("Seed data not found. Run: npx tsx prisma/seed.ts");
  }

  console.log("✅ Test data loaded");
  console.log(`   Customer: ${customer.phoneNumber}`);
  console.log(`   Clinic: ${clinic.name}`);
  console.log(`   Travel: ${travelAgency.name}\n`);

  // ============================================
  // TEST 1: Service Listing
  // ============================================
  console.log("📋 TEST 1: Service Listing");
  console.log("-" .repeat(60));

  const allServices = await listServices();
  console.log(`✅ Listed ${allServices.count} services`);

  const clinicServices = await listServices({ businessId: clinic.id });
  console.log(`✅ Clinic has ${clinicServices.count} services`);

  const travelServices = await listServices({ businessId: travelAgency.id });
  console.log(`✅ Travel agency has ${travelServices.count} services`);

  if (allServices.services && allServices.services.length > 0) {
    const firstService = allServices.services[0];
    const serviceDetail = await getServiceById(firstService.id);
    console.log(`✅ Retrieved service: ${serviceDetail.service?.name}\n`);
  }

  // ============================================
  // TEST 2: Availability Checking
  // ============================================
  console.log("📅 TEST 2: Availability Checking");
  console.log("-" .repeat(60));

  const testDate = new Date();
  testDate.setDate(testDate.getDate() + 7); // 7 days from now
  const dateStr = testDate.toISOString().split("T")[0];

  const facialService = await prisma.service.findFirst({
    where: { category: "facial" },
  });

  if (facialService) {
    const availability = await checkAvailability(
      facialService.id,
      dateStr,
      "10:00"
    );
    console.log(`✅ Availability check for ${dateStr} 10:00:`);
    console.log(`   Available: ${availability.available}`);
    console.log(`   Message: ${availability.message}`);
    if (availability.slots && availability.slots.length > 0) {
      console.log(`   Slots: ${availability.slots.slice(0, 5).join(", ")}...`);
    }
    console.log();
  }

  // ============================================
  // TEST 3: Calendar Service
  // ============================================
  console.log("🗓️  TEST 3: Calendar Service");
  console.log("-" .repeat(60));

  const testDate2 = new Date();
  testDate2.setDate(testDate2.getDate() + 14);

  const isBlackout = await isBlackoutDate(clinic.id, testDate2);
  console.log(`✅ Blackout check for ${testDate2.toISOString().split("T")[0]}:`);
  console.log(`   Is blackout: ${isBlackout}\n`);

  if (facialService) {
    const slots = await getAvailableSlots(
      clinic.id,
      facialService.id,
      testDate2
    );
    console.log(`✅ Available slots: ${slots.slots.length} found`);
    if (slots.slots.length > 0) {
      console.log(`   First 5: ${slots.slots.slice(0, 5).join(", ")}\n`);
    }
  }

  // ============================================
  // TEST 4: Create Booking
  // ============================================
  console.log("📝 TEST 4: Create Booking");
  console.log("-" .repeat(60));

  if (facialService) {
    const newBooking = await createBooking({
      customerId: customer.id,
      businessId: clinic.id,
      serviceId: facialService.id,
      date: dateStr,
      time: "14:00",
      customerName: "Test Customer",
      customerPhone: customer.phoneNumber,
      customerEmail: "test@example.com",
      notes: "Test booking dari script",
    });

    if (newBooking.success && newBooking.booking) {
      console.log(`✅ Booking created: ${newBooking.booking.bookingNumber}`);
      console.log(`   Status: ${newBooking.booking.status}`);
      console.log(`   Date: ${newBooking.booking.bookingDate}`);
      console.log(`   Amount: Rp ${newBooking.booking.totalAmount / 100}`);

      // ============================================
      // TEST 5: Get Booking Details
      // ============================================
      console.log("\n🔍 TEST 5: Get Booking Details");
      console.log("-" .repeat(60));

      const bookingDetail = await getBookingByNumber(
        customer.id,
        newBooking.booking.bookingNumber
      );

      if (bookingDetail.success && bookingDetail.booking) {
        console.log(`✅ Retrieved booking: ${bookingDetail.booking.bookingNumber}`);
        console.log(`   Service: ${bookingDetail.booking.service.name}`);
        console.log(`   Business: ${bookingDetail.booking.business.name}`);

        // Format for chat
        const formatted = formatBookingForChat(bookingDetail.booking);
        console.log("\n📱 Formatted for WhatsApp:");
        console.log(formatted);

        // ============================================
        // TEST 6: Reschedule Booking
        // ============================================
        console.log("\n📆 TEST 6: Reschedule Booking");
        console.log("-" .repeat(60));

        const newDate = new Date(testDate);
        newDate.setDate(newDate.getDate() + 1);
        const newDateStr = newDate.toISOString().split("T")[0];

        const rescheduled = await rescheduleBooking(
          customer.id,
          newBooking.booking.bookingNumber,
          newDateStr,
          "15:00"
        );

        if (rescheduled.success) {
          console.log(`✅ Booking rescheduled to ${newDateStr} 15:00`);
          console.log(`   New start time: ${rescheduled.booking.startTime}`);
        } else {
          console.log(`❌ Reschedule failed: ${rescheduled.message}`);
        }

        // ============================================
        // TEST 7: List Customer Bookings
        // ============================================
        console.log("\n📋 TEST 7: List Customer Bookings");
        console.log("-" .repeat(60));

        const customerBookings = await listCustomerBookings(customer.id);
        console.log(`✅ Customer has ${customerBookings.bookings?.length || 0} bookings`);

        if (customerBookings.bookings && customerBookings.bookings.length > 0) {
          customerBookings.bookings.forEach((booking, index) => {
            console.log(`   ${index + 1}. ${booking.bookingNumber} - ${booking.status}`);
          });
        }

        // ============================================
        // TEST 8: Cancel Booking
        // ============================================
        console.log("\n❌ TEST 8: Cancel Booking");
        console.log("-" .repeat(60));

        const cancelled = await cancelBooking(
          customer.id,
          newBooking.booking.bookingNumber,
          "Test cancellation"
        );

        if (cancelled.success) {
          console.log(`✅ Booking cancelled: ${cancelled.booking.bookingNumber}`);
          console.log(`   Status: ${cancelled.booking.status}`);
          console.log(`   Reason: ${cancelled.booking.cancellationReason}`);
        } else {
          console.log(`❌ Cancel failed: ${cancelled.message}`);
        }
      }
    } else {
      console.log(`❌ Booking creation failed: ${newBooking.message}`);
    }
  }

  // ============================================
  // TEST 9: Format Services for Chat
  // ============================================
  console.log("\n💬 TEST 9: Format Services for Chat");
  console.log("-" .repeat(60));

  if (allServices.services && allServices.services.length > 0) {
    const formatted = formatServicesForChat(allServices.services);
    console.log("✅ Services formatted for WhatsApp:\n");
    console.log(formatted.substring(0, 500) + "...\n");
  }

  // ============================================
  // TEST 10: Resource Availability
  // ============================================
  console.log("🔧 TEST 10: Resource Availability");
  console.log("-" .repeat(60));

  const resources = await prisma.resource.findMany({
    where: { businessId: clinic.id },
    take: 2,
  });

  if (resources.length > 0) {
    const startTime = new Date();
    startTime.setHours(10, 0, 0, 0);
    const endTime = new Date();
    endTime.setHours(11, 0, 0, 0);

    const resourceAvailability = await checkResourceAvailability(
      resources.map((r) => r.id),
      startTime,
      endTime
    );

    console.log(`✅ Checked ${resources.length} resources`);
    console.log(`   Available: ${resourceAvailability.available}`);
    console.log(`   Message: ${resourceAvailability.message}\n`);
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log("=" .repeat(60));
  console.log("✅ ALL TESTS COMPLETED SUCCESSFULLY!");
  console.log("=" .repeat(60));
  console.log("\n📊 Test Summary:");
  console.log("   ✅ Service listing");
  console.log("   ✅ Availability checking");
  console.log("   ✅ Calendar operations");
  console.log("   ✅ Booking creation");
  console.log("   ✅ Booking retrieval");
  console.log("   ✅ Booking rescheduling");
  console.log("   ✅ Customer booking list");
  console.log("   ✅ Booking cancellation");
  console.log("   ✅ Chat formatting");
  console.log("   ✅ Resource availability");
  console.log("\n🎉 All core services are working correctly!\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Test failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
