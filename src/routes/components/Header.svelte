<script>
  import Logo from "../../images/logo.png";
</script>

<header>
  <div class="inner">
    <div class="left">
      <a class="logo" href="/#"> <img src={Logo} class='logo-img'> </a>
      <a class={"link"} href="#/positions">Positions</a>
      <a class={"link"} href="#/leaderboard">Leaderboard</a>
      <a class={"link"} href="#/staking">Staking</a>
      <a class={"link"} href="#/pooling">Pooling</a>
    </div>
  </div>
</header>

<style>
  header {
    background-color: var(--eerie-black);
  }

  .inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--base-padding);
    height: var(--header-height);
  }

  .left {
    display: flex;
    align-items: center;
  }

  .link {
    color: var(--silver-chalice);
    margin-right: 14px;
    font-weight: 500;
    padding: 6px 5px;
    border-radius: var(--base-radius);
  }

  .link.active {
    color: #ddd;
  }

  .logo {
    margin-right: 26px;
    display: flex;
  }
  .logo-img {
    height: 30px;
  }

  @media (max-width: 600px) {
    .logo {
      margin-right: 12px;
    }
    .link {
      margin-right: 0;
    }
  }

  .link:hover {
    color: #fff;
    background-color: #242424;
  }
</style>
