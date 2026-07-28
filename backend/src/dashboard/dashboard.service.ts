import { BadRequestException, Injectable } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { UsersService } from '../users/users.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Injectable()
export class DashboardService {
  constructor(
    private ordersService: OrdersService,
    private productsService: ProductsService,
    private usersService: UsersService,
  ) {}

  async getSummary(query: DashboardQueryDto) {
    const { from, toExclusive, fromKey, toKey } = this.resolveDateRange(query);
    const report = await this.ordersService.getRevenueReport(from, toExclusive);
    const lowStockProducts = await this.productsService.getLowStock(10);
    const allStaff = await this.usersService.findAll();
    const activeStaff = allStaff.filter((u) => u.isActive).length;

    const formattedTop = report.topProducts.map((p) => ({
      productId: p.id,
      productName: p.name,
      totalQty: p.quantity,
      totalRevenue: Math.round(p.totalRevenue),
      totalProfit: Math.round(p.totalProfit),
    }));

    return {
      period: { from: fromKey, to: toKey },
      totalRevenue: report.totalRevenue,
      totalCost: report.totalCost,
      totalProfit: report.totalProfit,
      totalOrders: report.totalOrders,
      totalItems: report.totalItems,
      dailyRevenue: report.dailyRevenue,
      topProducts: formattedTop,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
      activeStaff,
    };
  }

  private resolveDateRange(query: DashboardQueryDto) {
    const today = this.formatDateKey(new Date());
    const fromKey = query.from || today;
    const toKey = query.to || today;
    const from = new Date(`${fromKey}T00:00:00`);
    const to = new Date(`${toKey}T00:00:00`);

    if (from > to) {
      throw new BadRequestException(
        'Ngày bắt đầu không được sau ngày kết thúc',
      );
    }

    const maxRange = new Date(from);
    maxRange.setDate(maxRange.getDate() + 366);
    if (to > maxRange) {
      throw new BadRequestException(
        'Khoảng báo cáo không được vượt quá 366 ngày',
      );
    }

    const toExclusive = new Date(to);
    toExclusive.setDate(toExclusive.getDate() + 1);
    return { from, toExclusive, fromKey, toKey };
  }

  private formatDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
