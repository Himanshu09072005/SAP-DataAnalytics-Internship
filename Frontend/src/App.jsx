import { useState, useEffect } from "react";
import api, { authHeader } from "./api";

export default function App() {

    const [token, setToken] = useState(
        localStorage.getItem("token") || ""
    );

    const [username, setUsername] = useState("");

    const [password, setPassword] = useState("");

    const [error, setError] = useState("");

    const [loading, setLoading] = useState(false);

    const [page, setPage] = useState("dashboard");

    const [dashboard, setDashboard] = useState({

        total_users:0,
        total_vendors:0,
        total_materials:0,
        total_purchase_requisitions:0,
        total_purchase_orders:0,
        total_goods_receipts:0,
        total_invoices:0,
        total_payments:0,
        total_inventory_value:0,
        total_invoice_value:0,
        total_amount_paid:0

    });

    const [materials,setMaterials]=useState([]);

    const [vendors,setVendors]=useState([]);

    const [purchaseRequisitions,setPurchaseRequisitions]=useState([]);

    const [purchaseOrders,setPurchaseOrders]=useState([]);

    const [goodsReceipts,setGoodsReceipts]=useState([]);
    
    async function login(e){

        e.preventDefault();

        setError("");

        try{

            const form=new URLSearchParams();

            form.append("username",username);

            form.append("password",password);

            const res=await api.post(

                "/auth/login",

                form,

                {

                    headers:{

                        "Content-Type":
                        "application/x-www-form-urlencoded"

                    }

                }

            );

            localStorage.setItem(

                "token",

                res.data.access_token

            );

            setToken(

                res.data.access_token

            );

        }

        catch(err){

            setError("Invalid Login");

        }

    }



    function logout(){

        localStorage.removeItem("token");

        setToken("");

        setUsername("");

        setPassword("");

        setPage("dashboard");

    }
    
    async function loadDashboard(){

        try{

            const res=await api.get(

                "/dashboard/summary",

                authHeader()

            );

            setDashboard(res.data);

        }

        catch(e){

            console.log(e);

        }

    }



    async function loadMaterials(){

        try{

            const res=await api.get(

                "/materials/",

                authHeader()

            );

            setMaterials(res.data);

        }

        catch(e){

            console.log(e);

            setMaterials([]);

        }

    }



    async function loadVendors(){

        try{

            const res=await api.get(

                "/vendors/",

                authHeader()

            );

            setVendors(res.data);

        }

        catch(e){

            console.log(e);

            setVendors([]);

        }

    }
    
    async function loadPurchaseRequisitions(){

        try{

            const res=await api.get(

                "/purchase-requisitions/",

                authHeader()

            );

            setPurchaseRequisitions(

                res.data

            );

        }

        catch(e){

            setPurchaseRequisitions([]);

        }

    }



    async function loadPurchaseOrders(){

        try{

            const res=await api.get(

                "/purchase-orders/",

                authHeader()

            );

            setPurchaseOrders(

                res.data

            );

        }

        catch(e){

            setPurchaseOrders([]);

        }

    }



    async function loadGoodsReceipts(){

        try{

            const res=await api.get(

                "/goods-receipts/",

                authHeader()

            );

            setGoodsReceipts(

                res.data

            );

        }

        catch(e){

            setGoodsReceipts([]);

        }

    }
    
    useEffect(()=>{

        if(!token) return;

        async function loadEverything(){

            setLoading(true);

            await Promise.all([

                loadDashboard(),

                loadMaterials(),

                loadVendors(),

                loadPurchaseRequisitions(),

                loadPurchaseOrders(),

                loadGoodsReceipts()

            ]);

            setLoading(false);

        }

        loadEverything();

    },[token]);
        if (!token) {

        return (

            <div className="login-container">

                <div className="card login-card">

                    <div className="card-body p-4">

                        <h2 className="text-center mb-4">

                            SAP Procurement ERP

                        </h2>

                        {

                            error &&

                            <div className="error-box">

                                {error}

                            </div>

                        }

                        <form onSubmit={login}>

                            <div className="mb-3">

                                <label className="form-label">

                                    Username

                                </label>

                                <input

                                    className="form-control"

                                    value={username}

                                    onChange={(e)=>

                                        setUsername(

                                            e.target.value

                                        )

                                    }

                                />

                            </div>

                            <div className="mb-4">

                                <label className="form-label">

                                    Password

                                </label>

                                <input

                                    type="password"

                                    className="form-control"

                                    value={password}

                                    onChange={(e)=>

                                        setPassword(

                                            e.target.value

                                        )

                                    }

                                />

                            </div>

                            <button

                                className="btn btn-primary w-100"

                            >

                                Login

                            </button>

                        </form>

                    </div>

                </div>

            </div>

        );

    }



    return (

        <div className="d-flex">

            <div className="sidebar">

                <h3>

                    SAP ERP

                </h3>

                <button

                    className={

                        page==="dashboard"

                        ? "active"

                        : ""

                    }

                    onClick={()=>setPage("dashboard")}

                >

                    Dashboard

                </button>

                <button

                    className={

                        page==="materials"

                        ? "active"

                        : ""

                    }

                    onClick={()=>setPage("materials")}

                >

                    Materials

                </button>

                <button

                    className={

                        page==="vendors"

                        ? "active"

                        : ""

                    }

                    onClick={()=>setPage("vendors")}

                >

                    Vendors

                </button>

                <button

                    className={

                        page==="pr"

                        ? "active"

                        : ""

                    }

                    onClick={()=>setPage("pr")}

                >

                    Purchase Requisitions

                </button>

                <button

                    className={

                        page==="po"

                        ? "active"

                        : ""

                    }

                    onClick={()=>setPage("po")}

                >

                    Purchase Orders

                </button>

                <button

                    className={

                        page==="gr"

                        ? "active"

                        : ""

                    }

                    onClick={()=>setPage("gr")}

                >

                    Goods Receipts

                </button>

                <button

                    className="btn btn-danger logout-btn"

                    onClick={logout}

                >

                    Logout

                </button>

            </div>

            <div className="main-content">

                {

                    loading &&

                    <div className="loading">

                        Loading...

                    </div>

                }

                {

                    !loading &&

                    page==="dashboard" &&

                    <>

                        <h2 className="module-title">

                            Dashboard

                        </h2>

                        <div className="row">

                            <div className="col-md-3">

                                <div className="card card-summary summary-blue">

                                    <div className="summary-card-body">

                                        <div className="summary-title">

                                            Users

                                        </div>

                                        <div className="summary-value">

                                            {dashboard.total_users}

                                        </div>

                                    </div>

                                </div>

                            </div>

                            <div className="col-md-3">

                                <div className="card card-summary summary-green">

                                    <div className="summary-card-body">

                                        <div className="summary-title">

                                            Vendors

                                        </div>

                                        <div className="summary-value">

                                            {dashboard.total_vendors}

                                        </div>

                                    </div>

                                </div>

                            </div>

                            <div className="col-md-3">

                                <div className="card card-summary summary-orange">

                                    <div className="summary-card-body">

                                        <div className="summary-title">

                                            Materials

                                        </div>

                                        <div className="summary-value">

                                            {dashboard.total_materials}

                                        </div>

                                    </div>

                                </div>

                            </div>

                            <div className="col-md-3">

                                <div className="card card-summary summary-red">

                                    <div className="summary-card-body">

                                        <div className="summary-title">

                                            Purchase Orders

                                        </div>

                                        <div className="summary-value">

                                            {dashboard.total_purchase_orders}

                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>

                        <div className="row mt-3">

                            <div className="col-md-4">

                                <div className="card card-summary summary-purple">

                                    <div className="summary-card-body">

                                        <div className="summary-title">

                                            Goods Receipts

                                        </div>

                                        <div className="summary-value">

                                            {dashboard.total_goods_receipts}

                                        </div>

                                    </div>

                                </div>

                            </div>

                            <div className="col-md-4">

                                <div className="card card-summary summary-dark">

                                    <div className="summary-card-body">

                                        <div className="summary-title">

                                            Inventory Value

                                        </div>

                                        <div className="summary-value">

                                            ₹{dashboard.total_inventory_value}

                                        </div>

                                    </div>

                                </div>

                            </div>

                            <div className="col-md-4">

                                <div className="card card-summary summary-green">

                                    <div className="summary-card-body">

                                        <div className="summary-title">

                                            Amount Paid

                                        </div>

                                        <div className="summary-value">

                                            ₹{dashboard.total_amount_paid}

                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </>

                }
                                {
                    !loading &&
                    page==="materials" &&

                    <div className="table-area">

                        <h2 className="module-title">

                            Materials

                        </h2>

                        <div className="table-responsive">

                            <table className="table table-bordered table-hover">

                                <thead>

                                    <tr>

                                        <th>ID</th>

                                        <th>Code</th>

                                        <th>Name</th>

                                        <th>Category</th>

                                        <th>Type</th>

                                        <th>Unit</th>

                                        <th>Price</th>

                                        <th>Stock</th>

                                        <th>Plant</th>

                                        <th>Status</th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {

                                        materials.length===0 ?

                                        <tr>

                                            <td
                                                colSpan="10"
                                                className="text-center"
                                            >

                                                No Materials Found

                                            </td>

                                        </tr>

                                        :

                                        materials.map((m)=>(

                                            <tr
                                                key={m.MaterialID}
                                            >

                                                <td>

                                                    {m.MaterialID}

                                                </td>

                                                <td>

                                                    {m.MaterialCode}

                                                </td>

                                                <td>

                                                    {m.MaterialName}

                                                </td>

                                                <td>

                                                    {m.Category}

                                                </td>

                                                <td>

                                                    {m.MaterialType}

                                                </td>

                                                <td>

                                                    {m.UnitOfMeasure}

                                                </td>

                                                <td>

                                                    ₹{m.UnitPrice}

                                                </td>

                                                <td>

                                                    {m.CurrentStock}

                                                </td>

                                                <td>

                                                    {m.Plant}

                                                </td>

                                                <td>

                                                    {m.Status}

                                                </td>

                                            </tr>

                                        ))

                                    }

                                </tbody>

                            </table>

                        </div>

                    </div>

                }



                {

                    !loading &&
                    page==="vendors" &&

                    <div className="table-area">

                        <h2 className="module-title">

                            Vendors

                        </h2>

                        <div className="table-responsive">

                            <table className="table table-bordered table-hover">

                                <thead>

                                    <tr>

                                        <th>ID</th>

                                        <th>Code</th>

                                        <th>Name</th>

                                        <th>Contact</th>

                                        <th>Phone</th>

                                        <th>Email</th>

                                        <th>City</th>

                                        <th>State</th>

                                        <th>Status</th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {

                                        vendors.length===0 ?

                                        <tr>

                                            <td
                                                colSpan="9"
                                                className="text-center"
                                            >

                                                No Vendors Found

                                            </td>

                                        </tr>

                                        :

                                        vendors.map((v)=>(

                                            <tr
                                                key={v.VendorID}
                                            >

                                                <td>{v.VendorID}</td>

                                                <td>{v.VendorCode}</td>

                                                <td>{v.VendorName}</td>

                                                <td>{v.ContactPerson}</td>

                                                <td>{v.Phone}</td>

                                                <td>{v.Email}</td>

                                                <td>{v.City}</td>

                                                <td>{v.State}</td>

                                                <td>{v.Status}</td>

                                            </tr>

                                        ))

                                    }

                                </tbody>

                            </table>

                        </div>

                    </div>

                }
                                {
                    !loading &&
                    page==="pr" &&

                    <div className="table-area">

                        <h2 className="module-title">

                            Purchase Requisitions

                        </h2>

                        <div className="table-responsive">

                            <table className="table table-bordered table-hover">

                                <thead>

                                    <tr>

                                        <th>PR ID</th>

                                        <th>PR Number</th>

                                        <th>Material ID</th>

                                        <th>Vendor ID</th>

                                        <th>User ID</th>

                                        <th>Quantity</th>

                                        <th>Unit Price</th>

                                        <th>Total</th>

                                        <th>Priority</th>

                                        <th>Status</th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {

                                        purchaseRequisitions.length===0 ?

                                        <tr>

                                            <td colSpan="10" className="text-center">

                                                No Purchase Requisitions Found

                                            </td>

                                        </tr>

                                        :

                                        purchaseRequisitions.map((pr)=>(

                                            <tr key={pr.PRID}>

                                                <td>{pr.PRID}</td>

                                                <td>{pr.PRNumber}</td>

                                                <td>{pr.MaterialID}</td>

                                                <td>{pr.VendorID}</td>

                                                <td>{pr.UserID}</td>

                                                <td>{pr.Quantity}</td>

                                                <td>{pr.UnitPrice}</td>

                                                <td>{pr.TotalAmount}</td>

                                                <td>{pr.Priority}</td>

                                                <td>{pr.Status}</td>

                                            </tr>

                                        ))

                                    }

                                </tbody>

                            </table>

                        </div>

                    </div>

                }



                {

                    !loading &&
                    page==="po" &&

                    <div className="table-area">

                        <h2 className="module-title">

                            Purchase Orders

                        </h2>

                        <div className="table-responsive">

                            <table className="table table-bordered table-hover">

                                <thead>

                                    <tr>

                                        <th>PO ID</th>

                                        <th>PO Number</th>

                                        <th>PR ID</th>

                                        <th>Vendor ID</th>

                                        <th>User ID</th>

                                        <th>Order Date</th>

                                        <th>Delivery Date</th>

                                        <th>Total</th>

                                        <th>Status</th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {

                                        purchaseOrders.length===0 ?

                                        <tr>

                                            <td colSpan="9" className="text-center">

                                                No Purchase Orders Found

                                            </td>

                                        </tr>

                                        :

                                        purchaseOrders.map((po)=>(

                                            <tr key={po.POID}>

                                                <td>{po.POID}</td>

                                                <td>{po.PONumber}</td>

                                                <td>{po.PRID}</td>

                                                <td>{po.VendorID}</td>

                                                <td>{po.UserID}</td>

                                                <td>{po.OrderDate}</td>

                                                <td>{po.ExpectedDeliveryDate}</td>

                                                <td>{po.TotalAmount}</td>

                                                <td>{po.Status}</td>

                                            </tr>

                                        ))

                                    }

                                </tbody>

                            </table>

                        </div>

                    </div>

                }



                {

                    !loading &&
                    page==="gr" &&

                    <div className="table-area">

                        <h2 className="module-title">

                            Goods Receipts

                        </h2>

                        <div className="table-responsive">

                            <table className="table table-bordered table-hover">

                                <thead>

                                    <tr>

                                        <th>GR ID</th>

                                        <th>GR Number</th>

                                        <th>PO ID</th>

                                        <th>Vendor ID</th>

                                        <th>Received By</th>

                                        <th>Receipt Date</th>

                                        <th>Quantity</th>

                                        <th>Quality</th>

                                        <th>Status</th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {

                                        goodsReceipts.length===0 ?

                                        <tr>

                                            <td colSpan="9" className="text-center">

                                                No Goods Receipts Found

                                            </td>

                                        </tr>

                                        :

                                        goodsReceipts.map((gr)=>(

                                            <tr key={gr.GRID}>

                                                <td>{gr.GRID}</td>

                                                <td>{gr.GRNumber}</td>

                                                <td>{gr.POID}</td>

                                                <td>{gr.VendorID}</td>

                                                <td>{gr.ReceivedBy}</td>

                                                <td>{gr.ReceiptDate}</td>

                                                <td>{gr.QuantityReceived}</td>

                                                <td>{gr.QualityStatus}</td>

                                                <td>{gr.Status}</td>

                                            </tr>

                                        ))

                                    }

                                </tbody>

                            </table>

                        </div>

                    </div>

                }

            </div>

        </div>

    );

}