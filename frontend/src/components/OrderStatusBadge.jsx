import { Badge } from './ui/Badge';
import { CheckCircle, Clock, XCircle, Package, Truck, AlertCircle } from 'lucide-react';

const STATUS_CONFIG = {
  PENDING: {
    label: 'Chờ xác nhận',
    variant: 'secondary',
    icon: Clock,
    description: 'Đơn hàng đang chờ xác nhận từ hệ thống',
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    variant: 'info',
    icon: CheckCircle,
    description: 'Đơn hàng đã được xác nhận',
  },
  PROCESSING: {
    label: 'Đang xử lý',
    variant: 'info',
    icon: Package,
    description: 'Đơn hàng đang được xử lý',
  },
  SHIPPED: {
    label: 'Đang giao',
    variant: 'warning',
    icon: Truck,
    description: 'Vé đang được giao đến bạn',
  },
  DELIVERED: {
    label: 'Đã giao',
    variant: 'success',
    icon: CheckCircle,
    description: 'Vé đã được giao thành công',
  },
  CANCELLED: {
    label: 'Đã huỷ',
    variant: 'destructive',
    icon: XCircle,
    description: 'Đơn hàng đã bị huỷ',
  },
  REFUNDED: {
    label: 'Đã hoàn tiền',
    variant: 'outline',
    icon: AlertCircle,
    description: 'Đơn hàng đã được hoàn tiền',
  },
  EXPIRED: {
    label: 'Hết hạn',
    variant: 'destructive',
    icon: XCircle,
    description: 'Đơn hàng đã hết hạn thanh toán',
  },
};

export default function OrderStatusBadge({ status, showDescription = false, className = '' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = config.icon;
  
  if (showDescription) {
    return (
      <div className={`flex items-start gap-2 ${className}`}>
        <div className="flex-shrink-0">
          <Badge variant={config.variant} className="flex items-center gap-1">
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>
        <div className="text-sm text-gray-600">
          {config.description}
        </div>
      </div>
    );
  }
  
  return (
    <Badge variant={config.variant} className={`flex items-center gap-1 ${className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// Helper function to get status color for custom styling
export function getOrderStatusColor(status) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return config.variant;
}

// Helper function to get status icon
export function getOrderStatusIcon(status) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return config.icon;
}