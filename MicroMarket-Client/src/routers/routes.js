import React from "react"
import Home from '../pages/Home/home';
import Login from '../pages/Login/login';
import PublicRoute from '../components/PublicRoute';
import PrivateRoute from '../components/PrivateRoute';
import NotFound from '../components/NotFound/notFound';
import Footer from '../components/layout/Footer/footer';
import Header from '../components/layout/Header/header';
import ProductDetail from '../pages/Product/productDetail/productDetail'
import Profile from '../pages/Profile/profile';
import Cart from '../pages/Purchase/Cart/cart';
import Pay from '../pages/Purchase/Pay/pay';
import CartHistory from '../pages/Purchase/ManagementCart/cartHistory';
import Contact from '../pages/Contact/contact';

import { Layout } from 'antd';
import { withRouter } from "react-router";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import FinalPay from "../pages/Purchase/FinalPay/finalPay";
import Register from "../pages/Register/register";
import ProductList from "../pages/Product/productList/productList";
import News from "../pages/News/news";
import NewsDetail from "../pages/NewsDetai/newsDetai";


const RouterURL = withRouter(({ location }) => {

    const PrivateContainer = () => (
        <div>
            <Layout style={{ minHeight: '100vh' }}>
                <Layout style={{ display: 'flex' }}>
                    <Header />
                    <Route exact path="/home">
                        <Home />
                    </Route>
                    <PrivateRoute exact path="/event-detail/:id">
                        <ProductDetail />
                    </PrivateRoute>
                    <PrivateRoute exact path="/profile">
                        <Profile />
                    </PrivateRoute>
                    <PrivateRoute exact path="/pay">
                        <Pay />
                    </PrivateRoute>
                    <PrivateRoute exact path="/final-pay">
                        <FinalPay />
                    </PrivateRoute>
                    <PrivateRoute exact path="/cart-history">
                        <CartHistory />
                    </PrivateRoute>
                    <PrivateRoute exact path="/product-list/:id">
                        <ProductList />
                    </PrivateRoute>
                    <Layout>
                        <Footer />
                    </Layout>
                </Layout>
            </Layout>
        </div>
    )

    const PublicContainer = () => (
        <div>
            <Layout style={{ minHeight: '100vh' }}>
                <Layout style={{ display: 'flex' }}>
                    <Header />
                    <Route exact path="/">
                        <Home />
                    </Route>
                    <Route exact path="/product-detail/:id">
                        <ProductDetail />
                    </Route>
                    <Route exact path="/cart">
                        <Cart />
                    </Route>
                    <Route exact path="/contact">
                        <Contact />
                    </Route>
                    <Route exact path="/news">
                        <News />
                    </Route>
                    <Route exact path="/news/:id">
                        <NewsDetail />
                    </Route>
                    <Route exact path="/product-list/:id">
                        <ProductList />
                    </Route> 
                    <Layout>
                        <Footer />
                    </Layout>
                </Layout>
            </Layout>
        </div>
    )

    const LoginContainer = () => (
        <div>
            <Layout style={{ minHeight: '100vh' }}>
                <Layout style={{ display: 'flex' }}>
                    <PublicRoute exact path="/">
                        <Login />
                    </PublicRoute>
                    <PublicRoute exact path="/login">
                        <Login />
                    </PublicRoute>
                    <PublicRoute exact path="/register">
                        <Register />
                    </PublicRoute>
                </Layout>
            </Layout>
        </div>
    )

    return (
        <div>
            <Router>
                <Switch>
                    <Route exact path="/">
                        <PublicContainer />
                    </Route>
                    <Route exact path="/product-detail/:id">
                        <PublicContainer />
                    </Route>
                    <Route exact path="/cart">
                        <PublicContainer />
                    </Route>
                    <Route exact path="/contact">
                        <PublicContainer />
                    </Route>
                    <Route exact path="/login">
                        <LoginContainer />
                    </Route>
                    <Route exact path="/register">
                        <LoginContainer />
                    </Route>
                    <Route exact path="/pay">
                        <PrivateContainer />
                    </Route>
                    <Route exact path="/home">
                        <PrivateContainer />
                    </Route>
                    <Route exact path="/profile">
                        <PrivateContainer />
                    </Route>
                    <Route exact path="/final-pay">
                        <PrivateContainer />
                    </Route>
                    <Route exact path="/cart-history">
                        <PrivateContainer />
                    </Route>
                    <Route exact path="/product-list/:id">
                        <PublicContainer />
                    </Route>
                    <Route exact path="/news">
                        <PublicContainer />
                    </Route>
                    <Route exact path="/news/:id">
                        <PublicContainer />
                    </Route>
                    <Route>
                        <NotFound />
                    </Route>
                </Switch>
            </Router>
        </div>
    )
})

export default RouterURL;
