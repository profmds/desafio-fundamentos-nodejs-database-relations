import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

interface IProductCart {
  product_id: string;
  price: number;
  quantity: number;
}

@injectable()
class CreateProductService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    // TODO
    const orderProducts: IProductCart[] = [];
    const checkCustomerExists = await this.customersRepository.findById(
      customer_id,
    );

    if (!checkCustomerExists) {
      throw new AppError('Invalid customer');
    }

    const countProducts = products.length;
    const checkProductsExists = await this.productsRepository.findAllById(
      products,
    );

    if (checkProductsExists.length !== countProducts) {
      throw new AppError('Invalid Product');
    }

    const listProducts = checkProductsExists.map(product => {
      const productsFound = products.find(
        newProduct => newProduct.id === product.id,
      );

      if (
        productsFound?.quantity &&
        productsFound?.quantity > product.quantity
      ) {
        throw new AppError('Product does not have quantity enought!');
      }

      orderProducts.push({
        product_id: product.id,
        quantity: Number(productsFound?.quantity),
        price: product.price,
      });

      return {
        id: product.id,
        quantity: product.quantity - Number(productsFound?.quantity),
      };
    });

    await this.productsRepository.updateQuantity(listProducts);

    const order = await this.ordersRepository.create({
      customer: checkCustomerExists,
      products: orderProducts,
    });
    return order;
  }
}

export default CreateProductService;
