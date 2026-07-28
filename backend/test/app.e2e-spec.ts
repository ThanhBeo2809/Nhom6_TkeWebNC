import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('/api/ (GET) trả về trạng thái ứng dụng', () => {
    return request(app.getHttpServer())
      .get('/api/')
      .expect(200)
      .expect('POS API is running');
  });

  it('/api/orders từ chối truy cập khi chưa đăng nhập', () => {
    return request(app.getHttpServer()).get('/api/orders').expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});
