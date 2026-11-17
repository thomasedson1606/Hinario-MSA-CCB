/**
 * Mock e Polyfill da ponte nativa AndroidHymnal para o clone web do Hinário Tocado
 * Permite que a aplicação execute com recursos VIP/Owner 100% liberados diretamente no navegador.
 */
(function() {
    console.log('[Hinario Clone] Inicializando ponte AndroidHymnal Polyfill...');

    if (typeof window.AndroidHymnal === 'undefined') {
        window.AndroidHymnal = {
            isOwnerMode: function() {
                return true;
            },
            getAccessLevel: function() {
                return "VIP";
            },
            getBillingProducts: function() {
                return JSON.stringify([
                    { productId: 'vip_lifetime', title: 'Hinário Tocado VIP Completo', price: 'R$ 0,00' }
                ]);
            },
            setCurrentContent: function(type, number) {
                console.log(`[AndroidHymnal] Conteúdo ativo: tipo=${type}, numero=${number}`);
            },
            rememberPlaybackPosition: function(ms) {
                // armazena posição de reprodução
            },
            setInstrumentPanelOpen: function(open) {
                // controle de painel de instrumentos
            },
            setLiveMode: function(active) {
                console.log(`[AndroidHymnal] Modo Live: ${active}`);
            },
            setRadioKeepScreenOn: function(keepOn) {
                if ('wakeLock' in navigator && keepOn) {
                    try { navigator.wakeLock.request('screen'); } catch(e){}
                }
            },
            updateGuitarCoach: function(visible, rhythmImage, markerPos, activeChord, nextChord) {
                // atualiza guia de acordes de violão
            },
            setGuitarCoverInfo: function(hymnNumber, title, teacher) {
                // capa personalizada de violão
            },
            receiveMidi: function(midiUri, bpm) {
                console.log(`[AndroidHymnal] MIDI recebido: BPM=${bpm}`);
            },
            realAudioReady: function() {
                console.log('[AndroidHymnal] Áudio pronto');
            },
            realAudioFailed: function(reason) {
                console.warn('[AndroidHymnal] Áudio falhou:', reason);
            },
            enterToqueJunto: function() {
                console.log('[AndroidHymnal] Entrando no modo Toque Junto');
                if (typeof window.startWebToqueCamera === 'function') {
                    window.startWebToqueCamera();
                }
            },
            leaveToqueJunto: function() {
                console.log('[AndroidHymnal] Saindo do modo Toque Junto');
                if (typeof window.stopWebToqueCamera === 'function') {
                    window.stopWebToqueCamera();
                }
            },
            stopRadioBackground: function() {
                console.log('[AndroidHymnal] Rádio background parada');
            },
            shareApp: function() {
                if (navigator.share) {
                    navigator.share({
                        title: 'Hinário Tocado CCB',
                        text: 'Hinário Tocado CCB - Partituras, Cifras e Áudio',
                        url: window.location.href
                    }).catch(()=>{});
                } else {
                    alert('Compartilhar: ' + window.location.href);
                }
            },
            savePdf: function(fileName, base64Data) {
                try {
                    const link = document.createElement('a');
                    link.href = 'data:application/pdf;base64,' + base64Data;
                    link.download = fileName || 'Partitura.pdf';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    return true;
                } catch(e) {
                    console.error('[AndroidHymnal] Erro ao salvar PDF:', e);
                    return false;
                }
            },
            saveRadioAudio: function(base64Data, fileName, mimeType) {
                try {
                    const link = document.createElement('a');
                    link.href = 'data:' + (mimeType || 'audio/webm') + ';base64,' + base64Data;
                    link.download = fileName || 'Hino-Gravado.webm';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    return true;
                } catch(e) {
                    console.error('[AndroidHymnal] Erro ao salvar áudio:', e);
                    return false;
                }
            }
        };
    }
})();
