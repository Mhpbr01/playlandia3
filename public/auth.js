document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-senha');
  const input = document.getElementById('senha');
  const mensagem = document.getElementById('mensagem');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const senha = input.value.trim();
    if (!senha) return;

    mensagem.textContent = 'Validando...';
    mensagem.style.color = 'black';

    try {
      const res = await fetch('/api/validar-senha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ senha }),
      });

      const data = await res.json();

      if (res.ok && data.sucesso) {
        mensagem.textContent = 'Acesso liberado!';
        mensagem.style.color = 'green';
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
        mensagem.textContent = data.mensagem || 'Erro ao validar';
        mensagem.style.color = 'red';
      }
    } catch (err) {
      mensagem.textContent = 'Erro na conexão com o servidor';
      mensagem.style.color = 'red';
      console.error(err);
    }
  });
});