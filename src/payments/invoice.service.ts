import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Payment } from './entities/payment.entity';

@Injectable()
export class InvoiceService {
  generateInvoice(payment: Payment): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Header with company branding
        doc
          .fillColor('#10b981')
          .fontSize(24)
          .font('Helvetica-Bold')
          .text('Jane On The Game', 40, 40);

        doc
          .fillColor('#6b7280')
          .fontSize(9)
          .font('Helvetica')
          .text('Professional Football Tips & Analytics', 40, 68);

        // Invoice title and number
        doc
          .fillColor('#111827')
          .fontSize(20)
          .font('Helvetica-Bold')
          .text('INVOICE', 400, 40, { align: 'right' });

        const invoiceNum =
          payment.invoiceNumber || payment.id.substring(0, 8).toUpperCase();
        doc
          .fillColor('#6b7280')
          .fontSize(9)
          .font('Helvetica')
          .text(`Invoice #: ${invoiceNum}`, 400, 65, { align: 'right' });

        doc.text(
          `Date: ${new Date(payment.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}`,
          400,
          78,
          { align: 'right' },
        );

        // Horizontal line
        doc
          .strokeColor('#e5e7eb')
          .lineWidth(1)
          .moveTo(40, 105)
          .lineTo(555, 105)
          .stroke();

        // Customer information and Status side by side
        doc
          .fillColor('#111827')
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('BILLED TO:', 40, 120);

        doc
          .fillColor('#374151')
          .fontSize(9)
          .font('Helvetica')
          .text(payment.user.fullName || 'N/A', 40, 135)
          .text(payment.user.email || payment.user.phone, 40, 148);

        if (payment.user.phone) {
          // Phone is already formatted as 254XXXXXXXXX, just add + prefix
          const formattedPhone = payment.user.phone.startsWith('254')
            ? `+${payment.user.phone}`
            : payment.user.phone;
          doc.text(formattedPhone, 40, 161);
        }

        // Payment status badge
        const statusX = 400;
        const statusColor =
          payment.status === 'completed'
            ? '#10b981'
            : payment.status === 'pending'
              ? '#f59e0b'
              : '#ef4444';

        doc
          .fillColor(statusColor)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('STATUS', statusX, 120, { align: 'right' });

        doc.fontSize(12).text(payment.status.toUpperCase(), statusX, 133, {
          align: 'right',
        });

        // Table header
        const tableTop = 190;
        doc.fillColor('#f3f4f6').rect(40, tableTop, 515, 25).fill();

        doc
          .fillColor('#374151')
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('DESCRIPTION', 50, tableTop + 8)
          .text('METHOD', 280, tableTop + 8)
          .text('AMOUNT', 450, tableTop + 8, { align: 'right' });

        // Table content
        const contentTop = tableTop + 35;
        const description = payment.subscriptionPlan
          ? `${payment.subscriptionPlan.toUpperCase()} Subscription`
          : 'Subscription Payment';

        doc
          .fillColor('#111827')
          .fontSize(9)
          .font('Helvetica')
          .text(description, 50, contentTop)
          .text(payment.method.toUpperCase(), 280, contentTop);

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(
            `KES ${Number(payment.amount).toLocaleString()}`,
            450,
            contentTop,
            {
              align: 'right',
            },
          );

        // Show subscription details
        let descriptionLine = contentTop + 14;
        if (payment.subscriptionPlan && payment.subscriptionDurationMonths) {
          doc
            .fillColor('#6b7280')
            .fontSize(8)
            .font('Helvetica')
            .text(
              `Plan: ${payment.subscriptionPlan.toUpperCase()} - ${payment.subscriptionDurationMonths} month${payment.subscriptionDurationMonths > 1 ? 's' : ''} access`,
              50,
              descriptionLine,
              { width: 200 },
            );
          descriptionLine += 12;
        }

        if (payment.description) {
          doc
            .fillColor('#6b7280')
            .fontSize(8)
            .font('Helvetica')
            .text(payment.description, 50, descriptionLine, { width: 200 });
        }

        // Horizontal line
        doc
          .strokeColor('#e5e7eb')
          .lineWidth(1)
          .moveTo(40, contentTop + 50)
          .lineTo(555, contentTop + 50)
          .stroke();

        // Totals section
        const totalsTop = contentTop + 65;
        doc
          .fillColor('#6b7280')
          .fontSize(9)
          .font('Helvetica')
          .text('Subtotal:', 350, totalsTop)
          .text('Tax (0%):', 350, totalsTop + 16)
          .text(
            `KES ${Number(payment.amount).toLocaleString()}`,
            450,
            totalsTop,
            {
              align: 'right',
            },
          )
          .text('KES 0', 450, totalsTop + 16, { align: 'right' });

        // Total with background
        const totalTop = totalsTop + 40;
        doc
          .fillColor('#10b981')
          .rect(350, totalTop - 3, 205, 24)
          .fill();

        doc
          .fillColor('#ffffff')
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('TOTAL:', 360, totalTop + 3)
          .text(
            `KES ${Number(payment.amount).toLocaleString()}`,
            450,
            totalTop + 3,
            {
              align: 'right',
            },
          );

        // Transaction details
        if (payment.transactionId) {
          const transactionTop = totalTop + 40;
          doc
            .fillColor('#6b7280')
            .fontSize(8)
            .font('Helvetica')
            .text('Transaction ID:', 40, transactionTop)
            .fillColor('#111827')
            .text(payment.transactionId, 115, transactionTop);
        }

        // Footer - positioned higher to fit on one page
        const footerTop = 680;
        doc
          .strokeColor('#e5e7eb')
          .lineWidth(1)
          .moveTo(40, footerTop)
          .lineTo(555, footerTop)
          .stroke();

        doc
          .fillColor('#6b7280')
          .fontSize(8)
          .font('Helvetica')
          .text('Thank you for your business!', 40, footerTop + 15, {
            align: 'center',
            width: 515,
          });

        doc.text(
          'For support, contact us at support@janeonthegame.com',
          40,
          footerTop + 28,
          { align: 'center', width: 515 },
        );

        doc.text(
          '© 2025 Jane On The Game. All rights reserved.',
          40,
          footerTop + 41,
          {
            align: 'center',
            width: 515,
          },
        );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
