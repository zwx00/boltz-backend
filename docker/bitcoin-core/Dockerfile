ARG UBUNTU_VERSION
ARG BERKELEY_VERSION

FROM boltz/berkeley-db:${BERKELEY_VERSION} AS berkeley-db

# Build Bitcoin Core
FROM ubuntu:${UBUNTU_VERSION} AS bitcoin-core

ARG VERSION

COPY --from=berkeley-db /opt /opt

RUN apt-get update && apt-get -y upgrade
RUN DEBIAN_FRONTEND=noninteractive apt-get -y install \
  git \
  wget \
  libtool \
  python3 \
  automake \
  pkg-config \
  libzmq3-dev \
  bsdmainutils \
  libevent-dev \
  autotools-dev \
  libsqlite3-dev \
  build-essential \
  libboost-test-dev \
  libboost-chrono-dev \
  libboost-system-dev \
  libboost-thread-dev \
  libboost-filesystem-dev

ENV BITCOIN_PREFIX=/opt/bitcoin-${VERSION}

# This PR is needed to create Taproot addresses: https://github.com/bitcoin/bitcoin/pull/22364
RUN git clone https://github.com/achow101/bitcoin.git

WORKDIR /bitcoin

RUN git checkout default-tr-desc

RUN ./autogen.sh
RUN ./configure LDFLAGS=-L`ls -d /opt/db*`/lib/ CPPFLAGS=-I`ls -d /opt/db*`/include/ \
    --prefix=${BITCOIN_PREFIX} \
    --enable-endomorphism \
    --mandir=/usr/share/man \
    --disable-ccache \
    --disable-tests \
    --disable-bench \
    --without-gui \
    --with-daemon \
    --with-utils \
    --with-libs

RUN make -j$(nproc)
RUN make install

RUN strip --strip-all ${BITCOIN_PREFIX}/bin/bitcoind
RUN strip --strip-all ${BITCOIN_PREFIX}/bin/bitcoin-tx
RUN strip --strip-all ${BITCOIN_PREFIX}/bin/bitcoin-cli
RUN strip --strip-all ${BITCOIN_PREFIX}/bin/bitcoin-wallet

# Assemble the final image
FROM ubuntu:${UBUNTU_VERSION}

ARG VERSION

RUN apt-get update && apt-get -y upgrade
RUN apt-get -y install \
  libzmq3-dev \
  libevent-dev \
  libboost-chrono-dev \
  libboost-system-dev \
  libboost-thread-dev \
  libboost-filesystem-dev

COPY --from=bitcoin-core /opt/bitcoin-${VERSION}/bin /bin

EXPOSE 18332 18333 18444 18443

ENTRYPOINT ["bitcoind"]
