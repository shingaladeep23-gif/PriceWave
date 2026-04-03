from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
import io
import json
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER

from ..database import get_db
from ..models import db_models
from .auth import get_current_user

router = APIRouter(prefix="/order", tags=["invoice"])

PRIMARY = HexColor("#2563eb")
DARK = HexColor("#131921")
MUTED = HexColor("#6b7280")
BORDER = HexColor("#e5e7eb")
LIGHT_BG = HexColor("#f8fafc")
WHITE = HexColor("#ffffff")
SUCCESS = HexColor("#16a34a")


def format_inr(amount: float) -> str:
    """Format a number as INR with the rupee symbol."""
    try:
        import locale
        locale.setlocale(locale.LC_ALL, '')
    except Exception:
        pass

    if amount >= 100000:
        lakhs = amount / 100000
        return f"\u20b9{lakhs:,.2f}L"

    whole = int(amount)
    paise = int(round((amount - whole) * 100))
    s = str(whole)
    if len(s) > 3:
        last3 = s[-3:]
        rest = s[:-3]
        parts = []
        while len(rest) > 2:
            parts.append(rest[-2:])
            rest = rest[:-2]
        parts.append(rest)
        parts.reverse()
        formatted = ",".join(parts) + "," + last3
    else:
        formatted = s

    if paise:
        return f"\u20b9{formatted}.{paise:02d}"
    return f"\u20b9{formatted}"


def build_invoice_pdf(order, items, user) -> io.BytesIO:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Title"],
        fontSize=22,
        textColor=DARK,
        spaceAfter=2,
    )

    subtitle_style = ParagraphStyle(
        "InvoiceSubtitle",
        parent=styles["Normal"],
        fontSize=9,
        textColor=MUTED,
        spaceAfter=6,
    )

    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontSize=11,
        fontName="Helvetica-Bold",
        textColor=DARK,
        spaceBefore=14,
        spaceAfter=6,
    )

    normal_style = ParagraphStyle(
        "NormalText",
        parent=styles["Normal"],
        fontSize=9.5,
        textColor=DARK,
        leading=14,
    )

    right_style = ParagraphStyle(
        "RightText",
        parent=styles["Normal"],
        fontSize=9.5,
        textColor=DARK,
        alignment=TA_RIGHT,
    )

    muted_style = ParagraphStyle(
        "MutedText",
        parent=styles["Normal"],
        fontSize=8.5,
        textColor=MUTED,
    )

    elements = []

    # Header
    elements.append(Paragraph("INVOICE", title_style))
    elements.append(Paragraph("PriceWave E-Commerce", subtitle_style))
    elements.append(Spacer(1, 4 * mm))

    # Order info & customer info side by side
    order_date = order.created_at.strftime("%d %b %Y, %I:%M %p") if order.created_at else "N/A"
    customer_name = user.name or user.email.split("@")[0]

    info_data = [
        [
            Paragraph(f"<b>Order ID:</b> #{order.id}", normal_style),
            Paragraph(f"<b>Customer:</b> {customer_name}", right_style),
        ],
        [
            Paragraph(f"<b>Date:</b> {order_date}", normal_style),
            Paragraph(f"<b>Email:</b> {user.email}", right_style),
        ],
        [
            Paragraph(
                f"<b>Status:</b> {(order.status.value if order.status else 'processing').replace('_', ' ').title()}",
                normal_style,
            ),
            Paragraph("", right_style),
        ],
    ]

    # Delivery address
    if order.delivery_address:
        try:
            addr = json.loads(order.delivery_address)
            addr_str = f"{addr.get('name', '')}, {addr.get('address_line', '')}, {addr.get('city', '')}, {addr.get('state', '')} - {addr.get('pincode', '')}"
            info_data.append([
                Paragraph(f"<b>Deliver To:</b> {addr_str}", normal_style),
                Paragraph("", right_style),
            ])
        except Exception:
            pass

    info_table = Table(info_data, colWidths=["55%", "45%"])
    info_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6 * mm))

    # Divider
    divider_data = [["" ]]
    divider = Table(divider_data, colWidths=["100%"])
    divider.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, 0), 1, BORDER),
    ]))
    elements.append(divider)
    elements.append(Spacer(1, 4 * mm))

    # Items heading
    elements.append(Paragraph("Order Items", heading_style))

    # Table header
    col_widths = ["8%", "44%", "12%", "18%", "18%"]
    header_row = [
        Paragraph("<b>#</b>", ParagraphStyle("TH", parent=normal_style, fontSize=9, fontName="Helvetica-Bold", textColor=WHITE)),
        Paragraph("<b>Product</b>", ParagraphStyle("TH", parent=normal_style, fontSize=9, fontName="Helvetica-Bold", textColor=WHITE)),
        Paragraph("<b>Qty</b>", ParagraphStyle("TH", parent=normal_style, fontSize=9, fontName="Helvetica-Bold", textColor=WHITE, alignment=TA_CENTER)),
        Paragraph("<b>Unit Price</b>", ParagraphStyle("TH", parent=normal_style, fontSize=9, fontName="Helvetica-Bold", textColor=WHITE, alignment=TA_RIGHT)),
        Paragraph("<b>Total</b>", ParagraphStyle("TH", parent=normal_style, fontSize=9, fontName="Helvetica-Bold", textColor=WHITE, alignment=TA_RIGHT)),
    ]

    table_data = [header_row]

    for idx, item in enumerate(items, 1):
        product_name = item.product.name if item.product else f"Product #{item.product_id}"
        line_total = item.price_at_time * item.quantity

        qty_style = ParagraphStyle("qty", parent=normal_style, alignment=TA_CENTER)
        price_style = ParagraphStyle("price", parent=normal_style, alignment=TA_RIGHT)

        table_data.append([
            Paragraph(str(idx), normal_style),
            Paragraph(product_name, normal_style),
            Paragraph(str(item.quantity), qty_style),
            Paragraph(format_inr(item.price_at_time), price_style),
            Paragraph(format_inr(line_total), price_style),
        ])

    items_table = Table(table_data, colWidths=col_widths)
    items_table.setStyle(TableStyle([
        # Header row
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        # All rows
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        # Row borders
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, BORDER),
        ("LINEBELOW", (0, -1), (-1, -1), 1, DARK),
        # Alternating row bg
        *[
            ("BACKGROUND", (0, i), (-1, i), LIGHT_BG)
            for i in range(2, len(table_data), 2)
        ],
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 5 * mm))

    # Grand total
    total_data = [
        [
            "",
            "",
            "",
            Paragraph("<b>Grand Total</b>", ParagraphStyle("gt_label", parent=normal_style, fontSize=11, fontName="Helvetica-Bold", alignment=TA_RIGHT)),
            Paragraph(f"<b>{format_inr(order.total_amount)}</b>", ParagraphStyle("gt_value", parent=normal_style, fontSize=12, fontName="Helvetica-Bold", alignment=TA_RIGHT, textColor=SUCCESS)),
        ],
    ]
    total_table = Table(total_data, colWidths=col_widths)
    total_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("BACKGROUND", (3, 0), (-1, 0), LIGHT_BG),
        ("LINEABOVE", (3, 0), (-1, 0), 1.5, DARK),
    ]))
    elements.append(total_table)
    elements.append(Spacer(1, 10 * mm))

    # Footer
    elements.append(Paragraph(
        "Thank you for shopping with PriceWave!",
        ParagraphStyle("footer", parent=normal_style, fontSize=9, textColor=MUTED, alignment=TA_CENTER),
    ))
    elements.append(Paragraph(
        f"Invoice generated on {datetime.now().strftime('%d %b %Y, %I:%M %p')}",
        ParagraphStyle("footer2", parent=normal_style, fontSize=8, textColor=MUTED, alignment=TA_CENTER, spaceBefore=4),
    ))

    doc.build(elements)
    buf.seek(0)
    return buf


@router.get("/invoice/{order_id}")
async def download_invoice(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(db_models.Order).where(db_models.Order.id == order_id)
    )
    order = result.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    items_result = await db.execute(
        select(db_models.OrderItem)
        .options(joinedload(db_models.OrderItem.product))
        .where(db_models.OrderItem.order_id == order.id)
    )
    items = items_result.scalars().all()

    if not items:
        raise HTTPException(status_code=404, detail="No items found for this order")

    pdf_buffer = build_invoice_pdf(order, items, user)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="invoice_{order_id}.pdf"'
        },
    )
